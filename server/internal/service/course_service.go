package service

import (
	"context"

	// "github.com/jackc/pgx/v5/pgtype"

	// "github.com/google/uuid"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/transport/http/dto"
	// "github.com/rs/zerolog/log"
)

type CourseService struct {
	database *Database
}

func NewCourseService(database *Database) *CourseService {
	return &CourseService{
		database: database,
	}
}

func (s *CourseService) GetCourses(ctx context.Context) ([]dto.CourseResponse, error) {
	courses, err := s.database.Queries.GetCourses(ctx)
	if err != nil {
		return nil, err
	}

	var response []dto.CourseResponse
	for _, row := range courses {
		uuidString := ""
		if row.ID.Valid {
			uuidString = convertPgtypeUUIDToString(row.ID)
		}

		response = append(response, dto.CourseResponse{
			ID:            uuidString,
			CourseName:    row.CourseName,
			CourseID:      row.CourseID,
			ProfessorName: row.ProfessorName,
		})
	}

	return response, nil
}