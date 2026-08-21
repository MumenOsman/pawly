-- name: GetUserByID :one
SELECT id, email, password_hash, owner_name, created_at
FROM users
WHERE id = $1;

-- name: GetUserByEmail :one
SELECT id, email, password_hash, owner_name, created_at
FROM users
WHERE email = $1;

-- name: CreateUser :one
INSERT INTO users (email, password_hash, owner_name)
VALUES ($1, $2, $3)
RETURNING id, email, owner_name, created_at;

-- name: ListUsers :many
SELECT id, owner_name, created_at
FROM users
ORDER BY id;
