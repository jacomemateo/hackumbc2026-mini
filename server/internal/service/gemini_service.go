package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/rs/zerolog/log"
	"google.golang.org/genai"
)

var (
	ErrGeminiUnavailable     = errors.New("gemini service is unavailable")
	ErrNoCategoriesExtracted = errors.New("no grading categories were extracted from the syllabus")
)

type GeminiService struct {
	client  *genai.Client
	model   string
	initErr error
}

type syllabusCategory struct {
	Name   string  `json:"name"`
	Weight float64 `json:"weight"`
}

type syllabusCategoryEnvelope struct {
	Categories []syllabusCategory `json:"categories"`
}

type reconciliationAssignment struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type reconciliationCategory struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	Weight float64 `json:"weight"`
}

type reconciliationEnvelope struct {
	Matches []reconciliationMatch `json:"matches"`
}

type reconciliationMatch struct {
	AssignmentID string  `json:"assignment_id"`
	CategoryID   *string `json:"category_id"`
}

func NewGeminiService(apiKey string, model string) *GeminiService {
	return NewGeminiVertexService("", "", apiKey, model)
}

func NewGeminiVertexService(project string, location string, apiKey string, model string) *GeminiService {
	service := &GeminiService{
		model: strings.TrimSpace(model),
	}
	if service.model == "" {
		service.model = "gemini-2.5-pro"
	}

	trimmedProject := strings.TrimSpace(project)
	trimmedLocation := strings.TrimSpace(location)
	trimmedKey := strings.TrimSpace(apiKey)
	if trimmedProject == "" {
		service.initErr = fmt.Errorf("%w: missing Vertex AI project", ErrGeminiUnavailable)
		return service
	}
	if trimmedLocation == "" {
		service.initErr = fmt.Errorf("%w: missing Vertex AI location", ErrGeminiUnavailable)
		return service
	}

	client, err := genai.NewClient(context.Background(), &genai.ClientConfig{
		APIKey:   trimmedKey,
		Project:  trimmedProject,
		Location: trimmedLocation,
		Backend:  genai.BackendVertexAI,
	})
	if err != nil {
		service.initErr = fmt.Errorf("%w: %v", ErrGeminiUnavailable, err)
		log.Warn().
			Err(err).
			Str("project", trimmedProject).
			Str("location", trimmedLocation).
			Str("model", service.model).
			Msg("Vertex AI client initialization failed")
		return service
	}

	service.client = client
	return service
}

func (s *GeminiService) ExtractCategoriesFromPDF(ctx context.Context, originalFilename string, pdfBytes []byte) ([]syllabusCategory, error) {
	if err := s.ensureReady(); err != nil {
		return nil, err
	}

	file, err := s.client.Files.Upload(ctx, bytes.NewReader(pdfBytes), &genai.UploadFileConfig{
		MIMEType:    "application/pdf",
		DisplayName: originalFilename,
	})
	if err != nil {
		return nil, fmt.Errorf("upload pdf to Vertex AI: %w", err)
	}
	defer s.deleteUploadedFile(ctx, file.Name)

	prompt := strings.TrimSpace(`
Extract the syllabus grading breakdown from this PDF.

Return only the official grading categories used to compute the course grade and each category's percentage weight.
Ignore grading scales, bonus policies, attendance notes, and individual assignments unless they are explicitly categories.
Weights must be numeric percentages like 10.5, not strings and not fractions.
If the syllabus uses repeated labels, combine them into a single category entry when they are clearly the same category.

Return JSON with this exact shape:
{"categories":[{"name":"...", "weight":10.5}]}
`)

	response, err := s.client.Models.GenerateContent(
		ctx,
		s.model,
		[]*genai.Content{
			genai.NewContentFromParts([]*genai.Part{
				genai.NewPartFromText(prompt),
				genai.NewPartFromURI(file.URI, file.MIMEType),
			}, genai.RoleUser),
		},
		&genai.GenerateContentConfig{
			ResponseMIMEType:   "application/json",
			ResponseJsonSchema: syllabusCategorySchema(),
			Temperature:        float32Ptr(0),
		},
	)
	if err != nil {
		return nil, fmt.Errorf("extract categories with Vertex AI: %w", err)
	}

	var parsed syllabusCategoryEnvelope
	if err := json.Unmarshal([]byte(strings.TrimSpace(response.Text())), &parsed); err != nil {
		return nil, fmt.Errorf("decode Vertex AI category response: %w", err)
	}

	normalized := make([]syllabusCategory, 0, len(parsed.Categories))
	seen := make(map[string]struct{}, len(parsed.Categories))
	for _, category := range parsed.Categories {
		name := normalizeWhitespace(category.Name)
		if name == "" || category.Weight <= 0 {
			continue
		}

		key := strings.ToLower(name)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		normalized = append(normalized, syllabusCategory{
			Name:   name,
			Weight: category.Weight,
		})
	}

	if len(normalized) == 0 {
		return nil, ErrNoCategoriesExtracted
	}

	return normalized, nil
}

func (s *GeminiService) MatchAssignmentsToCategories(ctx context.Context, assignments []reconciliationAssignment, categories []reconciliationCategory) (map[string]*string, error) {
	if len(assignments) == 0 || len(categories) == 0 {
		return map[string]*string{}, nil
	}

	if err := s.ensureReady(); err != nil {
		return nil, err
	}

	payloadBytes, err := json.Marshal(map[string]any{
		"assignments": assignments,
		"categories":  categories,
	})
	if err != nil {
		return nil, fmt.Errorf("encode reconciliation payload: %w", err)
	}

	prompt := fmt.Sprintf(strings.TrimSpace(`
You are assigning course grade entries to syllabus categories.

For each assignment, choose the single most likely category from the provided category list.
Use only the provided category IDs.
Return null for category_id only when no listed category is a plausible match.
Do not invent IDs or categories.

Data:
%s
`), string(payloadBytes))

	response, err := s.client.Models.GenerateContent(
		ctx,
		s.model,
		[]*genai.Content{genai.NewContentFromText(prompt, genai.RoleUser)},
		&genai.GenerateContentConfig{
			ResponseMIMEType:   "application/json",
			ResponseJsonSchema: reconciliationSchema(),
			Temperature:        float32Ptr(0),
		},
	)
	if err != nil {
		return nil, fmt.Errorf("categorize assignments with Vertex AI: %w", err)
	}

	var parsed reconciliationEnvelope
	if err := json.Unmarshal([]byte(strings.TrimSpace(response.Text())), &parsed); err != nil {
		return nil, fmt.Errorf("decode Vertex AI reconciliation response: %w", err)
	}

	validAssignments := make(map[string]struct{}, len(assignments))
	for _, assignment := range assignments {
		validAssignments[assignment.ID] = struct{}{}
	}

	validCategories := make(map[string]struct{}, len(categories))
	for _, category := range categories {
		validCategories[category.ID] = struct{}{}
	}

	matches := make(map[string]*string, len(parsed.Matches))
	for _, match := range parsed.Matches {
		if _, ok := validAssignments[match.AssignmentID]; !ok {
			return nil, fmt.Errorf("Vertex AI returned unknown assignment id %q", match.AssignmentID)
		}

		if match.CategoryID != nil {
			trimmed := normalizeWhitespace(*match.CategoryID)
			if trimmed == "" {
				match.CategoryID = nil
			} else {
				if _, ok := validCategories[trimmed]; !ok {
					return nil, fmt.Errorf("Vertex AI returned unknown category id %q", trimmed)
				}
				match.CategoryID = stringPtr(trimmed)
			}
		}

		matches[match.AssignmentID] = match.CategoryID
	}

	return matches, nil
}

func (s *GeminiService) ensureReady() error {
	if s.client != nil {
		return nil
	}
	if s.initErr != nil {
		return s.initErr
	}
	return ErrGeminiUnavailable
}

func (s *GeminiService) deleteUploadedFile(ctx context.Context, name string) {
	if s.client == nil || strings.TrimSpace(name) == "" {
		return
	}

	if _, err := s.client.Files.Delete(ctx, name, nil); err != nil {
		log.Warn().Err(err).Str("file", name).Msg("Failed to delete uploaded Vertex AI file")
	}
}

func float32Ptr(value float32) *float32 {
	return &value
}

func normalizeWhitespace(value string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(value)), " ")
}

func syllabusCategorySchema() map[string]any {
	return map[string]any{
		"type":                 "object",
		"required":             []string{"categories"},
		"additionalProperties": false,
		"propertyOrdering":     []string{"categories"},
		"properties": map[string]any{
			"categories": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type":                 "object",
					"required":             []string{"name", "weight"},
					"additionalProperties": false,
					"propertyOrdering":     []string{"name", "weight"},
					"properties": map[string]any{
						"name": map[string]any{
							"type": "string",
						},
						"weight": map[string]any{
							"type": "number",
						},
					},
				},
			},
		},
	}
}

func reconciliationSchema() map[string]any {
	return map[string]any{
		"type":                 "object",
		"required":             []string{"matches"},
		"additionalProperties": false,
		"propertyOrdering":     []string{"matches"},
		"properties": map[string]any{
			"matches": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type":                 "object",
					"required":             []string{"assignment_id", "category_id"},
					"additionalProperties": false,
					"propertyOrdering":     []string{"assignment_id", "category_id"},
					"properties": map[string]any{
						"assignment_id": map[string]any{
							"type": "string",
						},
						"category_id": map[string]any{
							"type": []string{"string", "null"},
						},
					},
				},
			},
		},
	}
}
