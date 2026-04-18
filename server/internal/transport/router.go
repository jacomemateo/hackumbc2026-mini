package transport

import (
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/rs/zerolog/log"

	config "github.com/jacomemateo/hackumbc2026-mini/server/cmd"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/service"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/transport/http/handlers"
)

type Router struct {
	handlers []handlers.Handler
	echo     *echo.Echo
	database *service.Database // Just store the Database, not the raw pool
	config   *config.Config
}

func NewRouter(database *service.Database, config *config.Config) (*Router, error) {
	r := Router{}
	r.database = database
	r.config = config
	r.echo = echo.New()

	r.echo.Use(middleware.RequestLogger())

	// Conditional CORS (Only for Development)
	// We check the environment variable we already have in .env.dev
	//
	// God i wish Go had macros this would be a lot nicer!
	if config.LogLevel == "debug" {
		log.Info().
			Str("CORS", "ENABLED").
			Str("Origins", "http://localhost:5173 http://127.0.0.1:5173 http://localhost http://127.0.0.1").
			Msg("CORS Config")
		r.echo.Use(middleware.CORSWithConfig(middleware.CORSConfig{
			AllowOrigins: []string{
				"http://localhost:5173",
				"http://127.0.0.1:5173",
				"http://localhost",
				"http://127.0.0.1",
			},
			AllowMethods: []string{
				http.MethodGet,
				http.MethodPost,
				http.MethodPut,
				http.MethodDelete,
				http.MethodOptions,
				http.MethodPatch,
			},
			AllowHeaders: []string{
				echo.HeaderOrigin,
				echo.HeaderContentType,
				echo.HeaderAccept,
				echo.HeaderAuthorization,
			},
			AllowCredentials: true,
		}))
	} else {
		log.Info().Str("CORS", "DISABLED").Msg("CORS Config")
	}

	courseService := service.NewCourseService(database)
	gradeService := service.NewGradeService(database)
	syllabusService := service.NewSyllabusService(database, config.SyllabusUploadDir)

	r.handlers = []handlers.Handler{
		handlers.NewCourseHandler(courseService),
		handlers.NewGradeHandler(gradeService),
		handlers.NewSyllabusHandler(syllabusService),
	}

	return &r, nil
}

func (r *Router) Start(ctx context.Context, address string) error {
	r.addRoutes()

	sc := echo.StartConfig{
		Address:         address,
		GracefulTimeout: 10 * time.Second,
		HideBanner:      false,
		HidePort:        false,
		OnShutdownError: func(err error) {
			r.echo.Logger.Error("graceful shutdown failed", "error", err)
		},
	}
	return sc.Start(ctx, r.echo)
}

func (r *Router) addRoutes() {
	api := r.echo.Group("/api")

	// Health check endpoint
	api.GET("/health", func(c *echo.Context) error {
		// Check if database is connected
		ctx := c.Request().Context()
		if err := r.database.Ping(ctx); err != nil {
			return c.JSON(http.StatusServiceUnavailable, map[string]string{
				"status": "unhealthy",
				"db":     "disconnected",
				"error":  err.Error(),
			})
		}

		return c.JSON(http.StatusOK, map[string]string{
			"status": "healthy",
			"db":     "connected",
			"time":   time.Now().String(),
		})
	})

	for _, h := range r.handlers {
		h.RegisterRoutes(api)
	}
}
