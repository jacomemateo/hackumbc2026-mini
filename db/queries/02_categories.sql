-- name: CreateCategory :one
INSERT INTO category (
    id_course,
    category_name,
    weight
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: DeleteCategoriesByCourse :exec
DELETE FROM category
WHERE id_course = @id_course;

-- name: GetCategoriesByCourse :many
SELECT
    id,
    id_course,
    category_name,
    weight
FROM category
WHERE id_course = @id_course
ORDER BY category_name ASC;

-- name: GetCategoryByCourseAndID :one
SELECT
    id,
    id_course,
    category_name,
    weight
FROM category
WHERE id = @id
  AND id_course = @id_course;
