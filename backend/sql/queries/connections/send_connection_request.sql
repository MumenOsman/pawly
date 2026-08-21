INSERT INTO connection_requests (
    sender_pet_id,
    receiver_pet_id,
    status
)
VALUES (
    $1,
    $2,
    'pending'
)
RETURNING *;