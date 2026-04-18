package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/jacomemateo/hackumbc2026-mini/server/internal/service"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/transport/http/dto"
	"github.com/labstack/echo/v5"
)

type HarvestHandler struct {
	harvestService *service.HarvestService
}

func NewHarvestHandler(harvestService *service.HarvestService) *HarvestHandler {
	return &HarvestHandler{
		harvestService: harvestService,
	}
}

func (h *HarvestHandler) RegisterRoutes(g *echo.Group) {
	g.POST("/harvest", h.ImportHarvest)
}

func (h *HarvestHandler) ImportHarvest(c *echo.Context) error {
	var req []dto.HarvestCourseRequest

	decoder := json.NewDecoder(c.Request().Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request body",
		})
	}

	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request body",
		})
	}

	if len(req) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Harvest payload cannot be empty",
		})
	}

	response, err := h.harvestService.ImportHarvest(c.Request().Context(), req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to import harvest",
		})
	}

	return c.JSON(http.StatusOK, response)
}
