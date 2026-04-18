-- code: language=postgres

-- 1. Create the types
CREATE TYPE grade_status AS ENUM (
  'GRADED',
  'UNGRADED'
);

-- 2. Create courses with UNIQUE constraint on course_id
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    course_name TEXT NOT NULL,
    course_id TEXT NOT NULL UNIQUE, 
    professor_name TEXT NOT NULL
);

-- 3. Create grades with DOUBLE PRECISION columns
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    id_course UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    assignment_name TEXT NOT NULL, 
    earned DOUBLE PRECISION,
    total DOUBLE PRECISION,
    g_status grade_status NOT NULL,
    posted_date TIMESTAMPTZ NOT NULL,
    
    CONSTRAINT positive_grades CHECK (
        (earned IS NULL OR earned >= 0) AND 
        (total IS NULL OR total > 0)
    )
);
