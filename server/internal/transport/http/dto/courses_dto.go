package dto

type CourseResponse struct {
	ID              string 	  `json:"id"`
	CourseName      string    `json:"course_name"`
	CourseID        string    `json:"course_id"`
	ProfessorName   string    `json:"professor_name"`
}
