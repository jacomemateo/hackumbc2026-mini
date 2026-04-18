package dto

type CourseResponse struct {
	ID            string `json:"id"`
	CourseName    string `json:"course_name"`
	CourseID      string `json:"course_id"`
	ProfessorName string `json:"professor_name"`
}

type CreateCourseRequest struct {
	CourseName    string `json:"course_name" validate:"required"`
	CourseID      string `json:"course_id" validate:"required"`
	ProfessorName string `json:"professor_name" validate:"required"`
}
