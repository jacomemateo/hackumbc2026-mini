package dto

import "time"

type SyllabusFileResponse struct {
	CourseID         string    `json:"course_id"`
	OriginalFilename string    `json:"original_filename"`
	ContentType      string    `json:"content_type"`
	SizeBytes        int64     `json:"size_bytes"`
	UploadedAt       time.Time `json:"uploaded_at"`
}
