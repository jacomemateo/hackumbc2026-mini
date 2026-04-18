-- name: CreateCourse :one
INSERT INTO courses (
    course_name,
    course_id,
    professor_name
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: GetCourses :many
SELECT * FROM courses
ORDER BY course_name ASC;

-- name: GetCourseByID :one
SELECT * FROM courses
WHERE id = $1;

-- name: UpsertCourseByCourseID :one
INSERT INTO courses (
    course_name,
    course_id,
    professor_name
) VALUES (
    $1, $2, $3
)
ON CONFLICT (course_id) DO UPDATE SET
    course_name = EXCLUDED.course_name,
    professor_name = EXCLUDED.professor_name
RETURNING *;
