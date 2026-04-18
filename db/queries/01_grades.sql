-- name: CountGradeRows :one
SELECT COUNT(*)
FROM grades g
JOIN courses c ON g.id_course = c.id
WHERE (sqlc.arg(course_id)::text = '' OR g.id_course::text = sqlc.arg(course_id)::text OR c.course_id = sqlc.arg(course_id)::text)
  AND (sqlc.arg(search)::text = '' OR g.assignment_name ILIKE '%' || sqlc.arg(search)::text || '%');

-- name: GetGrades :many
SELECT
    g.id,
    g.id_course,
    g.category_id,
    cat.category_name,
    g.assignment_name,
    g.earned,
    g.total,
    g.g_status,
    g.posted_date
FROM grades g
JOIN courses c ON g.id_course = c.id
LEFT JOIN category cat ON g.category_id = cat.id
WHERE (sqlc.arg(course_id)::text = '' OR g.id_course::text = sqlc.arg(course_id)::text OR c.course_id = sqlc.arg(course_id)::text)
  AND (sqlc.arg(search)::text = '' OR g.assignment_name ILIKE '%' || sqlc.arg(search)::text || '%')
ORDER BY
    -- Sort by grade value (Ratio calculation)
    CASE WHEN sqlc.arg(sort_by)::text = 'grade' AND sqlc.arg(sort_dir)::text = 'asc' THEN (g.earned / NULLIF(g.total, 0)) END ASC NULLS FIRST,
    CASE WHEN sqlc.arg(sort_by)::text = 'grade' AND sqlc.arg(sort_dir)::text = 'desc' THEN (g.earned / NULLIF(g.total, 0)) END DESC NULLS FIRST,
    -- Sort by date
    CASE WHEN sqlc.arg(sort_by)::text = 'date' AND sqlc.arg(sort_dir)::text = 'asc' THEN g.posted_date END ASC,
    CASE WHEN sqlc.arg(sort_by)::text = 'date' AND sqlc.arg(sort_dir)::text = 'desc' THEN g.posted_date END DESC,
    -- Sort by assignment name
    CASE WHEN sqlc.arg(sort_by)::text = 'assignment' AND sqlc.arg(sort_dir)::text = 'asc' THEN LOWER(g.assignment_name) END ASC,
    CASE WHEN sqlc.arg(sort_by)::text = 'assignment' AND sqlc.arg(sort_dir)::text = 'desc' THEN LOWER(g.assignment_name) END DESC,
    -- Default fallback
    g.posted_date DESC,
    g.id ASC
LIMIT sqlc.arg(num_rows)::int
OFFSET sqlc.arg(page_offset)::int;

-- name: GetGradeByID :one
SELECT *
FROM grades
WHERE id = @id;

-- name: CreateGrade :one
INSERT INTO grades (
    id_course,
    category_id,
    assignment_name,
    earned,
    total,
    g_status,
    posted_date
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: UpdateGrade :one
UPDATE grades
SET
    assignment_name = COALESCE(sqlc.narg('assignment_name'), assignment_name),
    earned = COALESCE(sqlc.narg('earned'), earned),
    total = COALESCE(sqlc.narg('total'), total),
    g_status = COALESCE(sqlc.narg('g_status'), g_status),
    posted_date = COALESCE(sqlc.narg('posted_date'), posted_date),
    category_id = CASE
        WHEN @category_id_set::boolean THEN sqlc.narg('category_id')
        ELSE category_id
    END
WHERE id = @id
RETURNING *;

-- name: DeleteGrade :exec
DELETE FROM grades
WHERE id = @id;

-- name: DeleteGradesByCourse :exec
DELETE FROM grades
WHERE id_course = @id_course;

-- name: GetGradesForReconciliation :many
SELECT
    id,
    id_course,
    assignment_name,
    category_id
FROM grades
WHERE id_course = @id_course
ORDER BY posted_date DESC, id ASC;

-- name: UpdateGradeCategory :exec
UPDATE grades
SET category_id = @category_id
WHERE id = @id;
