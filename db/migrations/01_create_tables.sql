-- code: language=postgres

CREATE TYPE grade_status AS ENUM (
  'GRADED',
  'UNGRADED'
);

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    course_name TEXT NOT NULL,
    course_id TEXT NOT NULL,
    professor_name TEXT NOT NULL
);

CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    id_course UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    earned INT,
    total INT,
    g_status grade_status NOT NULL,
    posted_date TIMESTAMPTZ NOT NULL,
    -- Constraint: If values aren't null, they must be greater than 0
    CONSTRAINT positive_grades CHECK (
        (earned IS NULL OR earned > 0) AND 
        (total IS NULL OR total > 0)
    )
);