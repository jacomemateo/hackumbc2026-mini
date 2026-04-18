package dto

import (
	"bytes"
	"encoding/json"
	"time"
)

type GradeResponse struct {
	ID             string    `json:"id"`
	CourseUUID     string    `json:"course_uuid"`
	CategoryID     *string   `json:"category_id"`
	CategoryName   *string   `json:"category_name"`
	AssignmentName string    `json:"assignment_name"`
	Earned         *float64  `json:"earned"`
	Total          *float64  `json:"total"`
	Status         string    `json:"status"`
	PostedDate     time.Time `json:"posted_date"`
}

type GradeMutationResponse struct {
	ID             string    `json:"id"`
	CourseUUID     string    `json:"course_uuid"`
	CategoryID     *string   `json:"category_id"`
	CategoryName   *string   `json:"category_name"`
	AssignmentName string    `json:"assignment_name"`
	Earned         *float64  `json:"earned"`
	Total          *float64  `json:"total"`
	Status         string    `json:"status"`
	PostedDate     time.Time `json:"posted_date"`
}

type CreateGradeRequest struct {
	CourseUUID     string    `json:"course_uuid" validate:"required,uuid"`
	CategoryID     *string   `json:"category_id" validate:"omitempty,uuid"`
	AssignmentName string    `json:"assignment_name" validate:"required"`
	Earned         *float64  `json:"earned" validate:"omitempty,gte=0"`
	Total          *float64  `json:"total" validate:"omitempty,gt=0"`
	Status         string    `json:"status" validate:"required,oneof=GRADED UNGRADED"`
	PostedDate     time.Time `json:"posted_date" validate:"required"`
}

type UpdateGradeRequest struct {
	AssignmentName *string             `json:"assignment_name"`
	CategoryID     NullableStringField `json:"category_id"`
	Earned         *float64            `json:"earned" validate:"omitempty,gte=0"`
	Total          *float64            `json:"total" validate:"omitempty,gt=0"`
	Status         *string             `json:"status" validate:"omitempty,oneof=GRADED UNGRADED"`
	PostedDate     *time.Time          `json:"posted_date"`
}

type NullableStringField struct {
	Set   bool
	Value *string
}

func (f *NullableStringField) UnmarshalJSON(data []byte) error {
	f.Set = true
	if bytes.Equal(bytes.TrimSpace(data), []byte("null")) {
		f.Value = nil
		return nil
	}

	var value string
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}

	f.Value = &value
	return nil
}
