package dto

type HarvestGradeValue struct {
	Earned *float64 `json:"earned"`
	Total  *float64 `json:"total"`
}

type HarvestGradeRequest struct {
	Assignment string            `json:"Assignment"`
	Date       string            `json:"Date"`
	Grade      HarvestGradeValue `json:"Grade"`
	Status     string            `json:"Status"`
}

type HarvestCourseRequest struct {
	Course     string                `json:"course"`
	CourseID   string                `json:"course_id"`
	Instructor string                `json:"instructor"`
	Grades     []HarvestGradeRequest `json:"grades"`
	Error      string                `json:"error,omitempty"`
}

type HarvestResponse struct {
	CoursesProcessed int `json:"courses_processed"`
	CoursesSkipped   int `json:"courses_skipped"`
	GradesInserted   int `json:"grades_inserted"`
}
