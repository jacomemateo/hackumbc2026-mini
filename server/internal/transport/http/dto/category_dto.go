package dto

type CategoryResponse struct {
	ID         string  `json:"id"`
	CourseUUID string  `json:"course_uuid"`
	Name       string  `json:"name"`
	Weight     float64 `json:"weight"`
}
