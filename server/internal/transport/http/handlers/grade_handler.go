package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/service"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/transport/http/dto"
	"github.com/labstack/echo/v5"
)

type GradeHandler struct {
	BinderValidator
	gradeService *service.GradeService
}

var gradeSortFields = map[string]SortFieldConfig{
	"assignment": {DefaultDirection: SortDirectionAsc},
	"date":       {DefaultDirection: SortDirectionDesc},
	"grade":      {DefaultDirection: SortDirectionDesc},
}

func NewGradeHandler(gradeService *service.GradeService) *GradeHandler {
	return &GradeHandler{
		gradeService: gradeService,
	}
}

func (h *GradeHandler) RegisterRoutes(g *echo.Group) {
	g.GET("/grades", h.GetGrades)
	g.GET("/grades/count", h.GetGradeCount)
	g.POST("/grades", h.CreateGrade)
	g.PATCH("/grades/:gradeID", h.UpdateGrade)
	g.DELETE("/grades/:gradeID", h.DeleteGrade)
}

func (h *GradeHandler) GetGradeCount(c *echo.Context) error {
	courseID := ParseCourseID(c)

	count, err := h.gradeService.GetGradeCount(c.Request().Context(), courseID, ParseSearch(c))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to count grades",
		})
	}

	return c.JSON(http.StatusOK, count)
}

func (h *GradeHandler) CreateGrade(c *echo.Context) error {
	var req dto.CreateGradeRequest
	if ok, err := h.bindAndValidate(c, &req); !ok {
		return err
	}

	if validationErr := validateGradePoints(req.Earned, req.Total); validationErr != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": validationErr.Error(),
		})
	}

	grade, err := h.gradeService.CreateGrade(c.Request().Context(), req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to create grade",
		})
	}

	return c.JSON(http.StatusCreated, grade)
}

func (h *GradeHandler) UpdateGrade(c *echo.Context) error {
	gradeID := strings.TrimSpace(c.Param("gradeID"))
	if !isValidUUID(gradeID) {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid gradeID parameter",
		})
	}

	var req dto.UpdateGradeRequest
	if ok, err := h.bindAndValidate(c, &req); !ok {
		return err
	}

	if req.AssignmentName == nil && req.Earned == nil && req.Total == nil && req.Status == nil && req.PostedDate == nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "At least one field must be provided",
		})
	}

	if validationErr := validateGradePoints(req.Earned, req.Total); validationErr != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": validationErr.Error(),
		})
	}

	grade, err := h.gradeService.UpdateGrade(c.Request().Context(), gradeID, req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to update grade",
		})
	}

	return c.JSON(http.StatusOK, grade)
}

func (h *GradeHandler) DeleteGrade(c *echo.Context) error {
	gradeID := strings.TrimSpace(c.Param("gradeID"))
	if !isValidUUID(gradeID) {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid gradeID parameter",
		})
	}

	if err := h.gradeService.DeleteGrade(c.Request().Context(), gradeID); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to delete grade",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Grade deleted successfully",
	})
}

func (h *GradeHandler) GetGrades(c *echo.Context) error {
	listQuery, err := ParseListQuery(c, "date", SortDirectionDesc, gradeSortFields)
	if err != nil {
		return err
	}

	grades, err := h.gradeService.GetGrades(c.Request().Context(), service.ListQuery{
		PageOffset: listQuery.PageOffset,
		NumRows:    listQuery.NumRows,
		CourseID:   listQuery.CourseID,
		Search:     listQuery.Search,
		SortBy:     listQuery.SortBy,
		SortDir:    listQuery.SortDir,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to fetch grades",
		})
	}

	return c.JSON(http.StatusOK, grades)
}

func validateGradePoints(earned *float64, total *float64) error {
	if (earned == nil) != (total == nil) {
		return fmt.Errorf("earned and total must either both be provided or both be omitted")
	}

	return nil
}

func isValidUUID(value string) bool {
	if value == "" {
		return false
	}

	_, err := uuid.Parse(value)
	return err == nil
}
