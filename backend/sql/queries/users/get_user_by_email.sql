SELECT
    id,
    email,
    password_hash,
    owner_name,
    created_at
FROM users
WHERE email = $1;