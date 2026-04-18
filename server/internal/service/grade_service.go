package service

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/repository"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/transport/http/dto"
)

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
				AssignmentName: row.AssignmentName,
				Earned:         intFromPgtypeInt4(row.Earned),
				Total:          intFromPgtypeInt4(row.Total),
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

	grade, err := s.database.Queries.CreateGrade(ctx, repository.CreateGradeParams{
		IDCourse:       courseUUID,
		AssignmentName: req.AssignmentName,
		Earned:         intPtrToPgtypeInt4(req.Earned),
		Total:          intPtrToPgtypeInt4(req.Total),
		GStatus:        status,
		PostedDate:     timeToPgtypeTimestamptz(req.PostedDate),
	})
	if err != nil {
		return dto.GradeMutationResponse{}, err
	}

	return dto.GradeMutationResponse{
		ID:             convertPgtypeUUIDToString(grade.ID),
		CourseUUID:     convertPgtypeUUIDToString(grade.IDCourse),
		AssignmentName: grade.AssignmentName,
		Earned:         intFromPgtypeInt4(grade.Earned),
		Total:          intFromPgtypeInt4(grade.Total),
		Status:         string(grade.GStatus),
		PostedDate:     grade.PostedDate.Time,
	}, nil
}

func (s *GradeService) UpdateGrade(ctx context.Context, gradeID string, req dto.UpdateGradeRequest) (dto.GradeMutationResponse, error) {
	gradeUUID, err := convertUUIDStringToPgtype(gradeID)
	if err != nil {
		return dto.GradeMutationResponse{}, err
	}

	status, err := nullableGradeStatusFromString(req.Status)
	if err != nil {
		return dto.GradeMutationResponse{}, err
	}

	grade, err := s.database.Queries.UpdateGrade(ctx, repository.UpdateGradeParams{
		AssignmentName: stringPtrToPgtypeText(req.AssignmentName),
		Earned:         intPtrToPgtypeInt4(req.Earned),
		Total:          intPtrToPgtypeInt4(req.Total),
		GStatus:        status,
		PostedDate:     timePtrToPgtypeTimestamptz(req.PostedDate),
		ID:             gradeUUID,
	})
	if err != nil {
		return dto.GradeMutationResponse{}, err
	}

	return dto.GradeMutationResponse{
		ID:             convertPgtypeUUIDToString(grade.ID),
		CourseUUID:     convertPgtypeUUIDToString(grade.IDCourse),
		AssignmentName: grade.AssignmentName,
		Earned:         intFromPgtypeInt4(grade.Earned),
		Total:          intFromPgtypeInt4(grade.Total),
		Status:         string(grade.GStatus),
		PostedDate:     grade.PostedDate.Time,
	}, nil
}

func (s *GradeService) DeleteGrade(ctx context.Context, gradeID string) error {
	gradeUUID, err := convertUUIDStringToPgtype(gradeID)
	if err != nil {
		return err
	}

	return s.database.Queries.DeleteGrade(ctx, gradeUUID)
}

func intFromPgtypeInt4(value pgtype.Int4) *int {
	if !value.Valid {
		return nil
	}

	intValue := int(value.Int32)
	return &intValue
}
