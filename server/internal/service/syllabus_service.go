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
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/transport/http/dto"
)

const (
	maxSyllabusSizeBytes = 10 << 20
	syllabusFilename     = "syllabus.pdf"
	metadataFilename     = "metadata.json"
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

	categories, err := s.gemini.ExtractCategoriesFromPDF(ctx, originalFilename, fileBytes)
	if err != nil {
		return dto.SyllabusFileResponse{}, err
	}

	metadata := syllabusMetadata{
		CourseID:         courseID,
		OriginalFilename: originalFilename,
		ContentType:      contentType,
		SizeBytes:        int64(len(fileBytes)),
		UploadedAt:       time.Now().UTC(),
	}

	courseDir := s.courseUploadDir(courseID)
	if err := os.MkdirAll(courseDir, 0o755); err != nil {
		return dto.SyllabusFileResponse{}, err
	}

	if err := os.WriteFile(filepath.Join(courseDir, syllabusFilename), fileBytes, 0o644); err != nil {
		return dto.SyllabusFileResponse{}, err
	}

	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		return dto.SyllabusFileResponse{}, err
	}

	if err := os.WriteFile(filepath.Join(courseDir, metadataFilename), metadataBytes, 0o644); err != nil {
		return dto.SyllabusFileResponse{}, err
	}

	tx, err := s.database.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return dto.SyllabusFileResponse{}, fmt.Errorf("begin syllabus transaction: %w", err)
	}

	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	queries := s.database.Queries.WithTx(tx)
	if err := replaceCourseCategories(ctx, queries, course.ID, categories); err != nil {
		return dto.SyllabusFileResponse{}, fmt.Errorf("replace syllabus categories: %w", err)
	}

	if err := s.reconciler.reconcileCourseInQueries(ctx, queries, course); err != nil {
		return dto.SyllabusFileResponse{}, fmt.Errorf("reconcile syllabus categories: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return dto.SyllabusFileResponse{}, fmt.Errorf("commit syllabus transaction: %w", err)
	}
	committed = true

	return dto.SyllabusFileResponse{
		CourseID:         metadata.CourseID,
		OriginalFilename: metadata.OriginalFilename,
		ContentType:      metadata.ContentType,
		SizeBytes:        metadata.SizeBytes,
		UploadedAt:       metadata.UploadedAt,
	}, nil
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

	return dto.SyllabusFileResponse{
		CourseID:         metadata.CourseID,
		OriginalFilename: metadata.OriginalFilename,
		ContentType:      metadata.ContentType,
		SizeBytes:        metadata.SizeBytes,
		UploadedAt:       metadata.UploadedAt,
	}, nil
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
