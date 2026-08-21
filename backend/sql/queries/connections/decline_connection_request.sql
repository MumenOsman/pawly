UPDATE connection_requests
SET status = 'declined'
WHERE sender_pet_id = $1
  AND receiver_pet_id = $2
RETURNING *;