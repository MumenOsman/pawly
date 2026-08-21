INSERT INTO messages (
    chat_id,
    sender_pet_id,
    content
)
VALUES (
    $1,
    $2,
    $3
)
RETURNING *;