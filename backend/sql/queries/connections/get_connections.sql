SELECT
    c.id,
    CASE
        WHEN c.pet1_id = $1 THEN p2.id
        ELSE p1.id
    END AS other_pet_id,
    CASE
        WHEN c.pet1_id = $1 THEN p2.pet_name
        ELSE p1.pet_name
    END AS other_pet_name,
    CASE
        WHEN c.pet1_id = $1 THEN p2.photo_url
        ELSE p1.photo_url
    END AS other_pet_photo,
    c.created_at
FROM connections c
JOIN pets p1 ON p1.id = c.pet1_id
JOIN pets p2 ON p2.id = c.pet2_id
WHERE c.pet1_id = $1
   OR c.pet2_id = $1
ORDER BY c.created_at DESC;