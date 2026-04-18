package service

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/repository"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/transport/http/dto"
)

type CategoryService struct {
	database *Database
}

func NewCategoryService(database *Database) *CategoryService {
	return &CategoryService{database: database}
}

func (s *CategoryService) GetCategoriesByCourse(ctx context.Context, courseID string) ([]dto.CategoryResponse, error) {
	courseUUID, err := convertUUIDStringToPgtype(courseID)
	if err != nil {
		return nil, err
	}

	if _, err := s.database.Queries.GetCourseByID(ctx, courseUUID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCourseNotFound
		}
		return nil, err
	}

	rows, err := s.database.Queries.GetCategoriesByCourse(ctx, courseUUID)
	if err != nil {
		return nil, err
	}

	return categoriesToDTO(rows), nil
}

func replaceCourseCategories(ctx context.Context, queries *repository.Queries, courseID pgtype.UUID, categories []syllabusCategory) error {
	if err := queries.DeleteCategoriesByCourse(ctx, courseID); err != nil {
		return err
	}

	for _, category := range categories {
		if _, err := queries.CreateCategory(ctx, repository.CreateCategoryParams{
			IDCourse:     courseID,
			CategoryName: category.Name,
			Weight:       category.Weight,
		}); err != nil {
			return err
		}
	}

	return nil
}

func categoriesToDTO(rows []repository.Category) []dto.CategoryResponse {
	categories := make([]dto.CategoryResponse, 0, len(rows))
	for _, row := range rows {
		categories = append(categories, dto.CategoryResponse{
			ID:         convertPgtypeUUIDToString(row.ID),
			CourseUUID: convertPgtypeUUIDToString(row.IDCourse),
			Name:       row.CategoryName,
			Weight:     row.Weight,
		})
	}
	return categories
}
