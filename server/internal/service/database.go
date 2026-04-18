package service

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jacomemateo/hackumbc2026-mini/server/internal/repository"
)

type Database struct {
	pool    *pgxpool.Pool
	Queries *repository.Queries
}

func NewDatabase(ctx context.Context, connString string) (*Database, error) {
	// 1. Connect to the database
	pool, err := pgxpool.New(ctx, connString)
	// Handle connection errors
	if err != nil {
		return nil, fmt.Errorf("create pool: %v", err)
	}

	// 2. Test the connection
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping database: %v", err)
	}

	if err := ensureCompatibleSchema(ctx, pool); err != nil {
		return nil, fmt.Errorf("ensure compatible schema: %v", err)
	}

	d := &Database{
		pool:    pool,
		Queries: repository.New(pool),
	}

	return d, nil
}

// Add a Ping method to check database connectivity
func (d *Database) Ping(ctx context.Context) error {
	if d.pool == nil {
		return fmt.Errorf("database connection not initialized")
	}
	return d.pool.Ping(ctx)
}

// Add a Close method to be called when the app shuts down
func (d *Database) Close() {
	if d.pool != nil {
		d.pool.Close()
	}
}

func ensureCompatibleSchema(ctx context.Context, pool *pgxpool.Pool) error {
	const ensureSchemaSQL = `
CREATE TABLE IF NOT EXISTS category (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    id_course UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    category_name TEXT NOT NULL,
    weight DOUBLE PRECISION NOT NULL,
    CONSTRAINT unique_category_per_course UNIQUE (id_course, category_name)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'grades'
          AND column_name = 'category_id'
    ) THEN
        ALTER TABLE grades
        ADD COLUMN category_id UUID;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'grades'
          AND constraint_name = 'grades_category_id_fkey'
    ) THEN
        ALTER TABLE grades
        ADD CONSTRAINT grades_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'grades'
          AND column_name = 'earned'
          AND data_type <> 'double precision'
    ) THEN
        ALTER TABLE grades
        ALTER COLUMN earned TYPE DOUBLE PRECISION
        USING earned::DOUBLE PRECISION;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'grades'
          AND column_name = 'total'
          AND data_type <> 'double precision'
    ) THEN
        ALTER TABLE grades
        ALTER COLUMN total TYPE DOUBLE PRECISION
        USING total::DOUBLE PRECISION;
    END IF;
END $$;

ALTER TABLE grades
DROP CONSTRAINT IF EXISTS positive_grades;

ALTER TABLE grades
ADD CONSTRAINT positive_grades CHECK (
    (earned IS NULL OR earned >= 0) AND
    (total IS NULL OR total > 0)
);
`

	_, err := pool.Exec(ctx, ensureSchemaSQL)
	return err
}
