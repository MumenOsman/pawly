SELECT
    m.id,
    p.pet_name AS sender,
    m.content,
    m.created_at
FROM messages m
JOIN pets p ON p.id = m.sender_pet_id
WHERE m.chat_id = $1
ORDER BY m.created_at ASC;