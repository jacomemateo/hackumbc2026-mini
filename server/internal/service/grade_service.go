package service

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/repository"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/transport/http/dto"
)

var ErrCategoryNotFound = errors.New("category not found")

type ListQuery struct {
	PageOffset int
	NumRows    int
	CourseID   string
	Search     string
	SortBy     string
	SortDir    string
}

type GradeService struct {
	database *Database
}

func NewGradeService(database *Database) *GradeService {
	return &GradeService{
		database: database,
	}
}

func (s *GradeService) GetGrades(ctx context.Context, query ListQuery) ([]dto.GradeResponse, error) {
	totalRows, err := s.database.Queries.CountGradeRows(ctx, repository.CountGradeRowsParams{
		CourseID: query.CourseID,
		Search:   query.Search,
	})
	if err != nil {
		return nil, err
	}

	return Paginate(int(totalRows), query.PageOffset, query.NumRows, func(offset, limit int) ([]dto.GradeResponse, error) {
		rows, err := s.database.Queries.GetGrades(ctx, repository.GetGradesParams{
			CourseID:   query.CourseID,
			Search:     query.Search,
			SortBy:     query.SortBy,
			SortDir:    query.SortDir,
			PageOffset: int32(offset),
			NumRows:    int32(limit),
		})
		if err != nil {
			return nil, err
		}

		grades := make([]dto.GradeResponse, 0, len(rows))
		for _, row := range rows {
			grades = append(grades, dto.GradeResponse{
				ID:             convertPgtypeUUIDToString(row.ID),
				CourseUUID:     convertPgtypeUUIDToString(row.IDCourse),
				CategoryID:     uuidPtrFromPgtypeUUID(row.CategoryID),
				CategoryName:   stringPtrFromPgtypeText(row.CategoryName),
				AssignmentName: row.AssignmentName,
				Earned:         floatFromPgtypeFloat8(row.Earned),
				Total:          floatFromPgtypeFloat8(row.Total),
				Status:         string(row.GStatus),
				PostedDate:     row.PostedDate.Time,
			})
		}

		return grades, nil
	})
}

func (s *GradeService) GetGradeCount(ctx context.Context, courseID string, search string) (int, error) {
	totalRows, err := s.database.Queries.CountGradeRows(ctx, repository.CountGradeRowsParams{
		CourseID: courseID,
		Search:   search,
	})
	if err != nil {
		return 0, err
	}

	return int(totalRows), nil
}

func (s *GradeService) CreateGrade(ctx context.Context, req dto.CreateGradeRequest) (dto.GradeMutationResponse, error) {
	courseUUID, err := convertUUIDStringToPgtype(req.CourseUUID)
	if err != nil {
		return dto.GradeMutationResponse{}, err
	}

	status, err := gradeStatusFromString(req.Status)
	if err != nil {
		return dto.GradeMutationResponse{}, err
	}

	categoryUUID, categoryName, err := s.resolveCourseCategory(ctx, courseUUID, req.CategoryID)
	if err != nil {
		return dto.GradeMutationResponse{}, err
	}

	grade, err := s.database.Queries.CreateGrade(ctx, repository.CreateGradeParams{
		IDCourse:       courseUUID,
		CategoryID:     categoryUUID,
		AssignmentName: req.AssignmentName,
		Earned:         floatPtrToPgtypeFloat8(req.Earned),
		Total:          floatPtrToPgtypeFloat8(req.Total),
		GStatus:        status,
		PostedDate:     timeToPgtypeTimestamptz(req.PostedDate),
	})
	if err != nil {
		return dto.GradeMutationResponse{}, err
	}

	return s.buildGradeMutationResponse(ctx, grade, categoryName)
}

func (s *GradeService) UpdateGrade(ctx context.Context, gradeID string, req dto.UpdateGradeRequest) (dto.GradeMutationResponse, error) {
	gradeUUID, err := convertUUIDStringToPgtype(gradeID)
	if err != nil {
		return dto.GradeMutationResponse{}, err
	}

	currentGrade, err := s.database.Queries.GetGradeByID(ctx, gradeUUID)
	if err != nil {
		return dto.GradeMutationResponse{}, err
	}

	status, err := nullableGradeStatusFromString(req.Status)
	if err != nil {
		return dto.GradeMutationResponse{}, err
	}

	var categoryUUID pgtype.UUID
	var categoryName *string
	if req.CategoryID.Set {
		categoryUUID, categoryName, err = s.resolveCourseCategory(ctx, currentGrade.IDCourse, req.CategoryID.Value)
		if err != nil {
			return dto.GradeMutationResponse{}, err
		}
	}

	grade, err := s.database.Queries.UpdateGrade(ctx, repository.UpdateGradeParams{
		AssignmentName: stringPtrToPgtypeText(req.AssignmentName),
		Earned:         floatPtrToPgtypeFloat8(req.Earned),
		Total:          floatPtrToPgtypeFloat8(req.Total),
		GStatus:        status,
		PostedDate:     timePtrToPgtypeTimestamptz(req.PostedDate),
		CategoryID:     categoryUUID,
		CategoryIDSet:  req.CategoryID.Set,
		ID:             gradeUUID,
	})
	if err != nil {
		return dto.GradeMutationResponse{}, err
	}

	return s.buildGradeMutationResponse(ctx, grade, categoryName)
}

func (s *GradeService) DeleteGrade(ctx context.Context, gradeID string) error {
	gradeUUID, err := convertUUIDStringToPgtype(gradeID)
	if err != nil {
		return err
	}

	return s.database.Queries.DeleteGrade(ctx, gradeUUID)
}

func (s *GradeService) resolveCourseCategory(ctx context.Context, courseUUID pgtype.UUID, categoryID *string) (pgtype.UUID, *string, error) {
	categoryUUID, err := nullableUUIDStringToPgtype(categoryID)
	if err != nil {
		return pgtype.UUID{}, nil, err
	}
	if !categoryUUID.Valid {
		return categoryUUID, nil, nil
	}

	category, err := s.database.Queries.GetCategoryByCourseAndID(ctx, repository.GetCategoryByCourseAndIDParams{
		ID:       categoryUUID,
		IDCourse: courseUUID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return pgtype.UUID{}, nil, ErrCategoryNotFound
		}
		return pgtype.UUID{}, nil, err
	}

	return categoryUUID, stringPtr(category.CategoryName), nil
}

func (s *GradeService) buildGradeMutationResponse(ctx context.Context, grade repository.Grade, categoryName *string) (dto.GradeMutationResponse, error) {
	if categoryName == nil && grade.CategoryID.Valid {
		category, err := s.database.Queries.GetCategoryByCourseAndID(ctx, repository.GetCategoryByCourseAndIDParams{
			ID:       grade.CategoryID,
			IDCourse: grade.IDCourse,
		})
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return dto.GradeMutationResponse{}, err
		}
		if err == nil {
			categoryName = stringPtr(category.CategoryName)
		}
	}

	return dto.GradeMutationResponse{
		ID:             convertPgtypeUUIDToString(grade.ID),
		CourseUUID:     convertPgtypeUUIDToString(grade.IDCourse),
		CategoryID:     uuidPtrFromPgtypeUUID(grade.CategoryID),
		CategoryName:   categoryName,
		AssignmentName: grade.AssignmentName,
		Earned:         floatFromPgtypeFloat8(grade.Earned),
		Total:          floatFromPgtypeFloat8(grade.Total),
		Status:         string(grade.GStatus),
		PostedDate:     grade.PostedDate.Time,
	}, nil
}

func floatFromPgtypeFloat8(value pgtype.Float8) *float64 {
	if !value.Valid {
		return nil
	}

	floatValue := value.Float64
	return &floatValue
}
