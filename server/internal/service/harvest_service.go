package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/repository"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/transport/http/dto"
)

var harvestDateLayouts = []string{
	"1/2/06",
	"01/02/06",
	"1/2/2006",
	"01/02/2006",
}

type HarvestService struct {
	database *Database
}

func NewHarvestService(database *Database) *HarvestService {
	return &HarvestService{
		database: database,
	}
}

func (s *HarvestService) ImportHarvest(ctx context.Context, courses []dto.HarvestCourseRequest) (dto.HarvestResponse, error) {
	response := dto.HarvestResponse{}

	for _, course := range courses {
		if strings.TrimSpace(course.Error) != "" {
			response.CoursesSkipped++
			continue
		}

		insertedGrades, err := s.importCourse(ctx, course)
		if err != nil {
			return dto.HarvestResponse{}, fmt.Errorf("import course %q: %w", strings.TrimSpace(course.CourseID), err)
		}

		response.CoursesProcessed++
		response.GradesInserted += insertedGrades
	}

	return response, nil
}

func (s *HarvestService) importCourse(ctx context.Context, course dto.HarvestCourseRequest) (int, error) {
	courseName := strings.TrimSpace(course.Course)
	courseID := strings.TrimSpace(course.CourseID)
	instructor := strings.TrimSpace(course.Instructor)

	if courseName == "" {
		return 0, fmt.Errorf("course name is required")
	}

	if courseID == "" {
		return 0, fmt.Errorf("course_id is required")
	}

	if instructor == "" {
		return 0, fmt.Errorf("instructor is required")
	}

	tx, err := s.database.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return 0, fmt.Errorf("begin transaction: %w", err)
	}

	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	queries := s.database.Queries.WithTx(tx)

	dbCourse, err := queries.UpsertCourseByCourseID(ctx, repository.UpsertCourseByCourseIDParams{
		CourseName:    courseName,
		CourseID:      courseID,
		ProfessorName: instructor,
	})
	if err != nil {
		return 0, fmt.Errorf("upsert course: %w", err)
	}

	// Treat each harvest as the latest snapshot for a course.
	if err := queries.DeleteGradesByCourse(ctx, dbCourse.ID); err != nil {
		return 0, fmt.Errorf("clear existing grades: %w", err)
	}

	for _, grade := range course.Grades {
		if err := insertHarvestGrade(ctx, queries, dbCourse.ID, grade); err != nil {
			return 0, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit transaction: %w", err)
	}
	committed = true

	return len(course.Grades), nil
}

func insertHarvestGrade(ctx context.Context, queries *repository.Queries, courseUUID pgtype.UUID, grade dto.HarvestGradeRequest) error {
	assignmentName := strings.TrimSpace(grade.Assignment)
	if assignmentName == "" {
		return fmt.Errorf("assignment name is required")
	}

	postedDate, err := parseHarvestDate(grade.Date)
	if err != nil {
		return fmt.Errorf("parse grade date for %q: %w", assignmentName, err)
	}

	status, err := harvestStatusFromString(grade.Status)
	if err != nil {
		return fmt.Errorf("parse grade status for %q: %w", assignmentName, err)
	}

	if (grade.Grade.Earned == nil) != (grade.Grade.Total == nil) {
		return fmt.Errorf("grade %q must include both earned and total or neither", assignmentName)
	}

	if grade.Grade.Earned != nil && *grade.Grade.Earned <= 0 {
		return fmt.Errorf("grade %q has non-positive earned value", assignmentName)
	}

	if grade.Grade.Total != nil && *grade.Grade.Total <= 0 {
		return fmt.Errorf("grade %q has non-positive total value", assignmentName)
	}

	if status == repository.GradeStatusGRADED && grade.Grade.Earned == nil {
		return fmt.Errorf("grade %q is marked graded but has no points", assignmentName)
	}

	_, err = queries.CreateGrade(ctx, repository.CreateGradeParams{
		IDCourse:       courseUUID,
		AssignmentName: assignmentName,
		Earned:         floatPtrToPgtypeFloat8(grade.Grade.Earned),
		Total:          floatPtrToPgtypeFloat8(grade.Grade.Total),
		GStatus:        status,
		PostedDate:     timeToPgtypeTimestamptz(postedDate),
	})
	if err != nil {
		return fmt.Errorf("insert grade %q: %w", assignmentName, err)
	}

	return nil
}

func parseHarvestDate(value string) (time.Time, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" || strings.EqualFold(trimmed, "none") {
		return time.Time{}, fmt.Errorf("date is required")
	}

	for _, layout := range harvestDateLayouts {
		parsed, err := time.ParseInLocation(layout, trimmed, time.Local)
		if err == nil {
			return parsed, nil
		}
	}

	return time.Time{}, fmt.Errorf("unsupported date format %q", value)
}

func harvestStatusFromString(value string) (repository.GradeStatus, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "graded":
		return repository.GradeStatusGRADED, nil
	case "not graded", "ungraded":
		return repository.GradeStatusUNGRADED, nil
	default:
		return "", fmt.Errorf("unsupported status %q", value)
	}
}
