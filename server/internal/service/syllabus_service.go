package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/repository"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/transport/http/dto"
	"github.com/rs/zerolog/log"
)

const (
	maxSyllabusSizeBytes  = 10 << 20
	syllabusFilename      = "syllabus.pdf"
	metadataFilename      = "metadata.json"
	parseStatusParsed     = "PARSED"
	parseStatusUploadOnly = "UPLOAD_ONLY"
)

var (
	ErrCourseNotFound    = errors.New("course not found")
	ErrSyllabusNotFound  = errors.New("syllabus not found")
	ErrInvalidSyllabus   = errors.New("only pdf uploads are supported")
	ErrSyllabusTooLarge  = errors.New("syllabus exceeds 10MB limit")
	ErrEmptySyllabusFile = errors.New("uploaded file is empty")
)

type SyllabusService struct {
	database   *Database
	uploadDir  string
	gemini     *GeminiService
	reconciler *ReconcilerService
}

type syllabusMetadata struct {
	CourseID         string    `json:"course_id"`
	OriginalFilename string    `json:"original_filename"`
	ContentType      string    `json:"content_type"`
	SizeBytes        int64     `json:"size_bytes"`
	UploadedAt       time.Time `json:"uploaded_at"`
	ParseStatus      string    `json:"parse_status"`
	ParseMessage     *string   `json:"parse_message,omitempty"`
}

func NewSyllabusService(database *Database, uploadDir string, gemini *GeminiService, reconciler *ReconcilerService) *SyllabusService {
	return &SyllabusService{
		database:   database,
		uploadDir:  uploadDir,
		gemini:     gemini,
		reconciler: reconciler,
	}
}

func (s *SyllabusService) UploadSyllabus(ctx context.Context, courseID string, originalFilename string, reader io.Reader) (dto.SyllabusFileResponse, error) {
	courseUUID, err := convertUUIDStringToPgtype(courseID)
	if err != nil {
		return dto.SyllabusFileResponse{}, err
	}

	course, err := s.database.Queries.GetCourseByID(ctx, courseUUID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.SyllabusFileResponse{}, ErrCourseNotFound
		}
		return dto.SyllabusFileResponse{}, err
	}

	if strings.ToLower(filepath.Ext(originalFilename)) != ".pdf" {
		return dto.SyllabusFileResponse{}, ErrInvalidSyllabus
	}

	fileBytes, err := io.ReadAll(io.LimitReader(reader, maxSyllabusSizeBytes+1))
	if err != nil {
		return dto.SyllabusFileResponse{}, err
	}

	if len(fileBytes) == 0 {
		return dto.SyllabusFileResponse{}, ErrEmptySyllabusFile
	}

	if len(fileBytes) > maxSyllabusSizeBytes {
		return dto.SyllabusFileResponse{}, ErrSyllabusTooLarge
	}

	contentType := http.DetectContentType(fileBytes)
	if contentType != "application/pdf" {
		return dto.SyllabusFileResponse{}, ErrInvalidSyllabus
	}

	metadata := syllabusMetadata{
		CourseID:         courseID,
		OriginalFilename: originalFilename,
		ContentType:      contentType,
		SizeBytes:        int64(len(fileBytes)),
		UploadedAt:       time.Now().UTC(),
		ParseStatus:      parseStatusUploadOnly,
	}

	courseDir := s.courseUploadDir(courseID)
	if err := os.MkdirAll(courseDir, 0o755); err != nil {
		return dto.SyllabusFileResponse{}, err
	}

	if err := os.WriteFile(filepath.Join(courseDir, syllabusFilename), fileBytes, 0o644); err != nil {
		return dto.SyllabusFileResponse{}, err
	}

	if err := s.writeMetadata(courseID, metadata); err != nil {
		return dto.SyllabusFileResponse{}, err
	}

	categories, err := s.gemini.ExtractCategoriesFromPDF(ctx, originalFilename, fileBytes)
	if err != nil {
		metadata.ParseMessage = stringPtr(parseFailureMessage(err))
		if writeErr := s.writeMetadata(courseID, metadata); writeErr != nil {
			return dto.SyllabusFileResponse{}, writeErr
		}

		log.Warn().
			Err(err).
			Str("course_id", courseID).
			Str("filename", originalFilename).
			Msg("Syllabus uploaded without category extraction")

		return syllabusMetadataToResponse(metadata), nil
	}

	if err := s.replaceCategoriesAndReconcile(ctx, course, categories); err != nil {
		metadata.ParseMessage = stringPtr("Syllabus uploaded, but category syncing failed. You can still download the PDF and retry parsing after the backend configuration is fixed.")
		if writeErr := s.writeMetadata(courseID, metadata); writeErr != nil {
			return dto.SyllabusFileResponse{}, writeErr
		}

		log.Error().
			Err(err).
			Str("course_id", courseID).
			Str("filename", originalFilename).
			Msg("Syllabus uploaded but category reconciliation failed")

		return syllabusMetadataToResponse(metadata), nil
	}

	metadata.ParseStatus = parseStatusParsed
	metadata.ParseMessage = nil
	if err := s.writeMetadata(courseID, metadata); err != nil {
		return dto.SyllabusFileResponse{}, err
	}

	return syllabusMetadataToResponse(metadata), nil
}

func (s *SyllabusService) GetSyllabusMetadata(ctx context.Context, courseID string) (dto.SyllabusFileResponse, error) {
	courseUUID, err := convertUUIDStringToPgtype(courseID)
	if err != nil {
		return dto.SyllabusFileResponse{}, err
	}

	if _, err := s.database.Queries.GetCourseByID(ctx, courseUUID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.SyllabusFileResponse{}, ErrCourseNotFound
		}
		return dto.SyllabusFileResponse{}, err
	}

	metadata, err := s.readMetadata(courseID)
	if err != nil {
		return dto.SyllabusFileResponse{}, err
	}

	return syllabusMetadataToResponse(metadata), nil
}

func (s *SyllabusService) GetSyllabusFile(ctx context.Context, courseID string) (string, dto.SyllabusFileResponse, error) {
	metadata, err := s.GetSyllabusMetadata(ctx, courseID)
	if err != nil {
		return "", dto.SyllabusFileResponse{}, err
	}

	filePath := filepath.Join(s.courseUploadDir(courseID), syllabusFilename)
	if _, err := os.Stat(filePath); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", dto.SyllabusFileResponse{}, ErrSyllabusNotFound
		}
		return "", dto.SyllabusFileResponse{}, err
	}

	return filePath, metadata, nil
}

func (s *SyllabusService) courseUploadDir(courseID string) string {
	return filepath.Join(s.uploadDir, courseID)
}

func (s *SyllabusService) readMetadata(courseID string) (syllabusMetadata, error) {
	metadataPath := filepath.Join(s.courseUploadDir(courseID), metadataFilename)
	metadataBytes, err := os.ReadFile(metadataPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return syllabusMetadata{}, ErrSyllabusNotFound
		}
		return syllabusMetadata{}, err
	}

	var metadata syllabusMetadata
	if err := json.Unmarshal(metadataBytes, &metadata); err != nil {
		return syllabusMetadata{}, fmt.Errorf("decode syllabus metadata: %w", err)
	}

	return metadata, nil
}

func (s *SyllabusService) writeMetadata(courseID string, metadata syllabusMetadata) error {
	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		return err
	}

	return os.WriteFile(filepath.Join(s.courseUploadDir(courseID), metadataFilename), metadataBytes, 0o644)
}

func (s *SyllabusService) replaceCategoriesAndReconcile(ctx context.Context, course repository.Course, categories []syllabusCategory) error {
	tx, err := s.database.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin syllabus transaction: %w", err)
	}

	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	queries := s.database.Queries.WithTx(tx)
	if err := replaceCourseCategories(ctx, queries, course.ID, categories); err != nil {
		return fmt.Errorf("replace syllabus categories: %w", err)
	}

	if err := s.reconciler.reconcileCourseInQueries(ctx, queries, course); err != nil {
		return fmt.Errorf("reconcile syllabus categories: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit syllabus transaction: %w", err)
	}
	committed = true

	return nil
}

func syllabusMetadataToResponse(metadata syllabusMetadata) dto.SyllabusFileResponse {
	return dto.SyllabusFileResponse{
		CourseID:         metadata.CourseID,
		OriginalFilename: metadata.OriginalFilename,
		ContentType:      metadata.ContentType,
		SizeBytes:        metadata.SizeBytes,
		UploadedAt:       metadata.UploadedAt,
		ParseStatus:      metadata.ParseStatus,
		ParseMessage:     metadata.ParseMessage,
	}
}

func parseFailureMessage(err error) string {
	switch {
	case errors.Is(err, ErrGeminiUnavailable):
		return "Syllabus uploaded, but automatic category extraction is unavailable because Gemini is not configured on the backend."
	case errors.Is(err, ErrNoCategoriesExtracted):
		return "Syllabus uploaded, but no grading categories could be extracted from this PDF."
	case strings.Contains(err.Error(), "SERVICE_DISABLED"):
		return "Syllabus uploaded, but automatic category extraction is unavailable because the Gemini API is disabled for the configured key or project."
	case strings.Contains(strings.ToLower(err.Error()), "model"), strings.Contains(strings.ToLower(err.Error()), "not found"):
		return "Syllabus uploaded, but the configured Gemini model is unavailable. Update GEMINI_MODEL and retry extraction."
	default:
		return "Syllabus uploaded, but automatic category extraction failed. You can still download the PDF and retry after the AI configuration is fixed."
	}
}
