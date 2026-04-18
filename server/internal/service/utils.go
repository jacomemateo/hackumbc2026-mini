package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/repository"
)

func convertPgtypeUUIDToString(uuid pgtype.UUID) string {
	// Skip rows with null TransactionID
	if !uuid.Valid {
		return "NULL UUID"
	}
	// Manually convert the byte array to a UUID string format
	// Source - https://stackoverflow.com/a/71134336
	// Posted by Letsgo Brandon, modified by community. See post 'Timeline' for change history
	// Retrieved 2026-02-28, License - CC BY-SA 4.0
	uuidString := fmt.Sprintf("%x-%x-%x-%x-%x", uuid.Bytes[0:4], uuid.Bytes[4:6], uuid.Bytes[6:8], uuid.Bytes[8:10], uuid.Bytes[10:16])
	return uuidString
}

func convertUUIDStringToPgtype(value string) (pgtype.UUID, error) {
	var uuid pgtype.UUID
	if err := uuid.Scan(value); err != nil {
		return pgtype.UUID{}, err
	}

	return uuid, nil
}

func floatPtrToPgtypeFloat8(value *float64) pgtype.Float8 {
	if value == nil {
		return pgtype.Float8{Valid: false}
	}

	return pgtype.Float8{
		Float64: *value,
		Valid:   true,
	}
}

func stringPtrToPgtypeText(value *string) pgtype.Text {
	if value == nil {
		return pgtype.Text{Valid: false}
	}

	return pgtype.Text{
		String: *value,
		Valid:  true,
	}
}

func nullableUUIDStringToPgtype(value *string) (pgtype.UUID, error) {
	if value == nil {
		return pgtype.UUID{Valid: false}, nil
	}

	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return pgtype.UUID{}, fmt.Errorf("uuid cannot be empty")
	}

	return convertUUIDStringToPgtype(trimmed)
}

func uuidPtrFromPgtypeUUID(value pgtype.UUID) *string {
	if !value.Valid {
		return nil
	}

	uuid := convertPgtypeUUIDToString(value)
	return &uuid
}

func stringPtr(value string) *string {
	return &value
}

func stringPtrFromPgtypeText(value pgtype.Text) *string {
	if !value.Valid {
		return nil
	}

	text := value.String
	return &text
}

func timeToPgtypeTimestamptz(value time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{
		Time:  value,
		Valid: true,
	}
}

func timePtrToPgtypeTimestamptz(value *time.Time) pgtype.Timestamptz {
	if value == nil {
		return pgtype.Timestamptz{Valid: false}
	}

	return timeToPgtypeTimestamptz(*value)
}

func gradeStatusFromString(value string) (repository.GradeStatus, error) {
	status := repository.GradeStatus(value)
	switch status {
	case repository.GradeStatusGRADED, repository.GradeStatusUNGRADED:
		return status, nil
	default:
		return "", fmt.Errorf("invalid grade status: %s", value)
	}
}

func nullableGradeStatusFromString(value *string) (repository.NullGradeStatus, error) {
	if value == nil {
		return repository.NullGradeStatus{Valid: false}, nil
	}

	status, err := gradeStatusFromString(*value)
	if err != nil {
		return repository.NullGradeStatus{}, err
	}

	return repository.NullGradeStatus{
		GradeStatus: status,
		Valid:       true,
	}, nil
}

// Internal utility to handle the pagination math
func Paginate[T any](total int, pageOffset int, numRows int, fetch func(offset, limit int) ([]T, error)) ([]T, error) {
	offset := pageOffset * numRows

	if offset+numRows > total {
		offset = max((total-1)/numRows*numRows, 0)
	}

	return fetch(offset, numRows)
}
