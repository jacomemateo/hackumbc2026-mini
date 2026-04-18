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

-- name: GetCourseByCourseID :one
SELECT * FROM courses
WHERE course_id = $1
ORDER BY id
LIMIT 1;

-- name: UpdateCourseByID :one
UPDATE courses
SET
    course_name = $1,
    course_id = $2,
    professor_name = $3
WHERE id = $4
RETURNING *;
