package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/repository"
)

type ReconcilerService struct {
	database *Database
	gemini   *GeminiService
}

func NewReconcilerService(database *Database, gemini *GeminiService) *ReconcilerService {
	return &ReconcilerService{
		database: database,
		gemini:   gemini,
	}
}

func (s *ReconcilerService) ReconcileCourse(ctx context.Context, courseID string) error {
	courseUUID, err := convertUUIDStringToPgtype(courseID)
	if err != nil {
		return err
	}

	tx, err := s.database.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin reconciliation transaction: %w", err)
	}

	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	queries := s.database.Queries.WithTx(tx)
	course, err := queries.GetCourseByID(ctx, courseUUID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrCourseNotFound
		}
		return err
	}

	if err := s.reconcileCourseInQueries(ctx, queries, course); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit reconciliation transaction: %w", err)
	}
	committed = true
	return nil
}

func (s *ReconcilerService) reconcileCourseInQueries(ctx context.Context, queries *repository.Queries, course repository.Course) error {
	categories, err := queries.GetCategoriesByCourse(ctx, course.ID)
	if err != nil {
		return fmt.Errorf("load course categories: %w", err)
	}
	if len(categories) == 0 {
		return nil
	}

	grades, err := queries.GetGradesForReconciliation(ctx, course.ID)
	if err != nil {
		return fmt.Errorf("load course grades: %w", err)
	}
	if len(grades) == 0 {
		return nil
	}

	assignments := make([]reconciliationAssignment, 0, len(grades))
	for _, grade := range grades {
		assignments = append(assignments, reconciliationAssignment{
			ID:   convertPgtypeUUIDToString(grade.ID),
			Name: grade.AssignmentName,
		})
	}

	categoryInputs := make([]reconciliationCategory, 0, len(categories))
	for _, category := range categories {
		categoryInputs = append(categoryInputs, reconciliationCategory{
			ID:     convertPgtypeUUIDToString(category.ID),
			Name:   category.CategoryName,
			Weight: category.Weight,
		})
	}

	matches, err := s.gemini.MatchAssignmentsToCategories(ctx, assignments, categoryInputs)
	if err != nil {
		return err
	}

	for _, grade := range grades {
		gradeID := convertPgtypeUUIDToString(grade.ID)
		categoryUUID, err := nullableUUIDStringToPgtype(matches[gradeID])
		if err != nil {
			return fmt.Errorf("decode category id for grade %s: %w", gradeID, err)
		}

		if err := queries.UpdateGradeCategory(ctx, repository.UpdateGradeCategoryParams{
			ID:         grade.ID,
			CategoryID: categoryUUID,
		}); err != nil {
			return fmt.Errorf("update category for grade %s: %w", gradeID, err)
		}
	}

	return nil
}
