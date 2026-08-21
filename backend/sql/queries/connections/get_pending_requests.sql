SELECT
    cr.sender_pet_id,
    p.pet_name,
    p.photo_url,
    cr.created_at
FROM connection_requests cr
JOIN pets p ON p.id = cr.sender_pet_id
WHERE cr.receiver_pet_id = $1
  AND cr.status = 'pending'
ORDER BY cr.created_at DESC;