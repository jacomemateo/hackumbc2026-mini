package handlers

import (
	"net/http"

	"github.com/jacomemateo/hackumbc2026-mini/server/internal/service"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/transport/http/dto"
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
	g.POST("/courses", h.CreateCourse)
}

func (h *CourseHandler) GetCourses(c *echo.Context) error {
	courses, err := h.courseService.GetCourses(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to fetch courses",
		})
	}

	return c.JSON(http.StatusOK, courses)
}

func (h *CourseHandler) CreateCourse(c *echo.Context) error {
	var req dto.CreateCourseRequest
	if ok, err := h.bindAndValidate(c, &req); !ok {
		return err
	}

	course, err := h.courseService.CreateCourse(c.Request().Context(), req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to create course",
		})
	}

	return c.JSON(http.StatusCreated, course)
}
