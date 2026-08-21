INSERT INTO users (
    email,
    password_hash,
    owner_name
)
VALUES (
    $1,
    $2,
    $3
)
RETURNING
    id,
    email,
    owner_name,
    created_at;