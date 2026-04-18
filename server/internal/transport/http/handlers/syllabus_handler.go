package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/service"
	"github.com/labstack/echo/v5"
)

type SyllabusHandler struct {
	syllabusService *service.SyllabusService
}

func NewSyllabusHandler(syllabusService *service.SyllabusService) *SyllabusHandler {
	return &SyllabusHandler{
		syllabusService: syllabusService,
	}
}

func (h *SyllabusHandler) RegisterRoutes(g *echo.Group) {
	g.POST("/courses/:courseID/syllabus/upload", h.UploadSyllabus)
	g.GET("/courses/:courseID/syllabus", h.GetSyllabusMetadata)
	g.GET("/courses/:courseID/syllabus/download", h.DownloadSyllabus)
}

func (h *SyllabusHandler) UploadSyllabus(c *echo.Context) error {
	courseID := strings.TrimSpace(c.Param("courseID"))
	if !isValidCourseUUID(courseID) {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid courseID parameter",
		})
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "A file field is required",
		})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Unable to read uploaded file",
		})
	}
	defer file.Close()

	response, err := h.syllabusService.UploadSyllabus(c.Request().Context(), courseID, fileHeader.Filename, file)
	if err != nil {
		return h.handleSyllabusError(c, err)
	}

	return c.JSON(http.StatusCreated, response)
}

func (h *SyllabusHandler) GetSyllabusMetadata(c *echo.Context) error {
	courseID := strings.TrimSpace(c.Param("courseID"))
	if !isValidCourseUUID(courseID) {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid courseID parameter",
		})
	}

	response, err := h.syllabusService.GetSyllabusMetadata(c.Request().Context(), courseID)
	if err != nil {
		return h.handleSyllabusError(c, err)
	}

	return c.JSON(http.StatusOK, response)
}

func (h *SyllabusHandler) DownloadSyllabus(c *echo.Context) error {
	courseID := strings.TrimSpace(c.Param("courseID"))
	if !isValidCourseUUID(courseID) {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid courseID parameter",
		})
	}

	filePath, metadata, err := h.syllabusService.GetSyllabusFile(c.Request().Context(), courseID)
	if err != nil {
		return h.handleSyllabusError(c, err)
	}

	return c.Attachment(filePath, metadata.OriginalFilename)
}

func (h *SyllabusHandler) handleSyllabusError(c *echo.Context, err error) error {
	switch {
	case errors.Is(err, service.ErrCourseNotFound):
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Course not found",
		})
	case errors.Is(err, service.ErrSyllabusNotFound):
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Syllabus not found",
		})
	case errors.Is(err, service.ErrInvalidSyllabus):
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Only PDF uploads are supported",
		})
	case errors.Is(err, service.ErrSyllabusTooLarge):
		return c.JSON(http.StatusRequestEntityTooLarge, map[string]string{
			"error": "Syllabus exceeds 10MB limit",
		})
	case errors.Is(err, service.ErrEmptySyllabusFile):
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Uploaded file is empty",
		})
	default:
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to process syllabus",
		})
	}
}

func isValidCourseUUID(value string) bool {
	_, err := uuid.Parse(value)
	return err == nil
}
