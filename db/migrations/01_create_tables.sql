-- code: language=postgres

-- 1. Create the types
CREATE TYPE grade_status AS ENUM (
  'GRADED',
  'UNGRADED'
);

-- 2. Create courses
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    course_name TEXT NOT NULL,
    -- Integrated UNIQUE constraint
    course_id TEXT NOT NULL UNIQUE, 
    professor_name TEXT NOT NULL
);


CREATE TABLE category (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    id_course UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    category_name TEXT NOT NULL,
    weight DOUBLE PRECISION NOT NULL,
    -- Integrated UNIQUE constraint for category names within the same course
    CONSTRAINT unique_category_per_course UNIQUE (id_course, category_name)
);

-- 3. Create grades
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    id_course UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES category(id) ON DELETE SET NULL,
    assignment_name TEXT NOT NULL, 
    -- Integrated DOUBLE PRECISION types
    earned DOUBLE PRECISION,
    total DOUBLE PRECISION,
    g_status grade_status NOT NULL,
    posted_date TIMESTAMPTZ NOT NULL,
    
    -- Integrated updated logic: earned can now be 0 (>= 0)
    CONSTRAINT positive_grades CHECK (
        (earned IS NULL OR earned >= 0) AND 
        (total IS NULL OR total > 0)
    )
);
