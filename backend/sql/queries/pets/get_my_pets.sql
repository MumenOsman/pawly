SELECT
    id,
    pet_name,
    animal_type,
    size,
    age,
    photo_url,
    created_at
FROM pets
WHERE owner_id = $1
ORDER BY created_at DESC;