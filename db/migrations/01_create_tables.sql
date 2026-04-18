-- code: language=postgres

CREATE TYPE grade_status AS ENUM (
  'GRADEED',
  'NOT GRADED',
  'N/A'
  ''
);

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    course_name TEXT NOT NULL,
    course_id TEXT NOT NULL,
    professor_name TEXT NOT NULL,
);

CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    id_course UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    grade INT NOT NULL, -- We're gonna store the grade as an integer from 0 to 1000
    g_status grade_status NOT NULL,
    posted_date TIMESTAMPTZ NOT NULL,
);

