package handlers

import (
	"net/http"

	"github.com/jacomemateo/hackumbc2026-mini/server/internal/service"
	"github.com/labstack/echo/v5"
)

type CourseHandler struct {
	BinderValidator
	courseService *service.CourseService
}

func NewCourseHandler(courseService *service.CourseService) *CourseHandler {
	return &CourseHandler{
		courseService: courseService,
	}
}

func (h *CourseHandler) RegisterRoutes(g *echo.Group) {
	g.GET("/courses", h.GetCourses)
}

func (h *CourseHandler) GetCourses(c *echo.Context) error {
	courses, err := h.courseService.GetCourses(c.Request().Context())
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, courses)
}