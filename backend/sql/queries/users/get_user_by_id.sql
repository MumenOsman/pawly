SELECT
    id,
    email,
    owner_name,
    created_at
FROM users
WHERE id = $1;