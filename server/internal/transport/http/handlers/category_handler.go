package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/jacomemateo/hackumbc2026-mini/server/internal/service"
	"github.com/labstack/echo/v5"
)

type CategoryHandler struct {
	categoryService *service.CategoryService
}

func NewCategoryHandler(categoryService *service.CategoryService) *CategoryHandler {
	return &CategoryHandler{
		categoryService: categoryService,
	}
}

func (h *CategoryHandler) RegisterRoutes(g *echo.Group) {
	g.GET("/courses/:courseID/categories", h.GetCourseCategories)
}

func (h *CategoryHandler) GetCourseCategories(c *echo.Context) error {
	courseID := strings.TrimSpace(c.Param("courseID"))
	if !isValidCourseUUID(courseID) {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid courseID parameter",
		})
	}

	categories, err := h.categoryService.GetCategoriesByCourse(c.Request().Context(), courseID)
	if err != nil {
		if errors.Is(err, service.ErrCourseNotFound) {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Course not found",
			})
		}

		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to fetch categories",
		})
	}

	return c.JSON(http.StatusOK, categories)
}
