package dto

import "time"

type GradeResponse struct {
	ID             string    `json:"id"`
	CourseUUID     string    `json:"course_uuid"`
	AssignmentName string    `json:"assignment_name"`
	Earned         *float64  `json:"earned"`
	Total          *float64  `json:"total"`
	Status         string    `json:"status"`
	PostedDate     time.Time `json:"posted_date"`
}

type GradeMutationResponse struct {
	ID             string    `json:"id"`
	CourseUUID     string    `json:"course_uuid"`
	AssignmentName string    `json:"assignment_name"`
	Earned         *float64  `json:"earned"`
	Total          *float64  `json:"total"`
	Status         string    `json:"status"`
	PostedDate     time.Time `json:"posted_date"`
}

type CreateGradeRequest struct {
	CourseUUID     string    `json:"course_uuid" validate:"required,uuid"`
	AssignmentName string    `json:"assignment_name" validate:"required"`
	Earned         *float64  `json:"earned" validate:"omitempty,gt=0"`
	Total          *float64  `json:"total" validate:"omitempty,gt=0"`
	Status         string    `json:"status" validate:"required,oneof=GRADED UNGRADED"`
	PostedDate     time.Time `json:"posted_date" validate:"required"`
}

type UpdateGradeRequest struct {
	AssignmentName *string    `json:"assignment_name"`
	Earned         *float64   `json:"earned" validate:"omitempty,gt=0"`
	Total          *float64   `json:"total" validate:"omitempty,gt=0"`
	Status         *string    `json:"status" validate:"omitempty,oneof=GRADED UNGRADED"`
	PostedDate     *time.Time `json:"posted_date"`
}
