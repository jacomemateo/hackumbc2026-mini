-- code: language=postgres

-- 1. Create the types first
CREATE TYPE grade_status AS ENUM (
  'GRADED',
  'UNGRADED'
);

-- 2. Create parent tables
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    course_name TEXT NOT NULL,
    course_id TEXT NOT NULL,
    professor_name TEXT NOT NULL
);

-- 3. Create dependent tables with all columns included
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    id_course UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    -- We include the column here directly
    assignment_name TEXT NOT NULL, 
    earned INT,
    total INT,
    g_status grade_status NOT NULL,
    posted_date TIMESTAMPTZ NOT NULL,
    
    -- Constraints are defined at the end for clarity
    CONSTRAINT positive_grades CHECK (
        (earned IS NULL OR earned > 0) AND 
        (total IS NULL OR total > 0)
    )
);