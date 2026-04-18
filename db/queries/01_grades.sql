-- name: CountGradeRows :one
SELECT COUNT(*)
FROM grades g
JOIN courses c ON g.id_course = c.id
WHERE @search = '' 
   OR c.course_name ILIKE '%' || @search || '%' 
   OR c.course_id ILIKE '%' || @search || '%'
   OR c.professor_name ILIKE '%' || @search || '%';

-- name: GetGrades :many
SELECT
    g.id,
    g.grade,
    g.g_status,
    g.posted_date,
    c.course_name,
    c.course_id,
    c.professor_name
FROM grades g
JOIN courses c ON g.id_course = c.id
WHERE @search = '' 
   OR c.course_name ILIKE '%' || @search || '%' 
   OR c.course_id ILIKE '%' || @search || '%'
   OR c.professor_name ILIKE '%' || @search || '%'
ORDER BY
    -- Sort by date
    CASE WHEN @sort_by = 'date' AND @sort_dir = 'asc' THEN g.posted_date END ASC,
    CASE WHEN @sort_by = 'date' AND @sort_dir = 'desc' THEN g.posted_date END DESC,
    -- Sort by grade value
    CASE WHEN @sort_by = 'grade' AND @sort_dir = 'asc' THEN g.grade END ASC,
    CASE WHEN @sort_by = 'grade' AND @sort_dir = 'desc' THEN g.grade END DESC,
    -- Sort by course name
    CASE WHEN @sort_by = 'course' AND @sort_dir = 'asc' THEN LOWER(c.course_name) END ASC,
    CASE WHEN @sort_by = 'course' AND @sort_dir = 'desc' THEN LOWER(c.course_name) END DESC,
    -- Default fallback sorting
    g.posted_date DESC,
    g.id ASC
LIMIT @num_rows
OFFSET @page_offset;

-- name: CreateGrade :one
INSERT INTO grades (
    id_course, 
    grade, 
    g_status, 
    posted_date
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: UpdateGrade :one
UPDATE grades
SET
    grade = COALESCE(sqlc.narg('grade'), grade),
    g_status = COALESCE(sqlc.narg('g_status'), g_status),
    posted_date = COALESCE(sqlc.narg('posted_date'), posted_date)
WHERE id = @id
RETURNING *;

-- name: DeleteGrade :exec
DELETE FROM grades
WHERE id = @id;
