package service

import (
	"context"

	"github.com/jacomemateo/hackumbc2026-mini/server/internal/repository"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/transport/http/dto"
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

func (s *CourseService) CreateCourse(ctx context.Context, req dto.CreateCourseRequest) (dto.CourseResponse, error) {
	course, err := s.database.Queries.CreateCourse(ctx, repository.CreateCourseParams{
		CourseName:    req.CourseName,
		CourseID:      req.CourseID,
		ProfessorName: req.ProfessorName,
	})
	if err != nil {
		return dto.CourseResponse{}, err
	}

	return dto.CourseResponse{
		ID:            convertPgtypeUUIDToString(course.ID),
		CourseName:    course.CourseName,
		CourseID:      course.CourseID,
		ProfessorName: course.ProfessorName,
	}, nil
}
