SELECT
    p.id,
    p.pet_name,
    p.animal_type,
    p.size,
    p.about_me,
    p.photo_url,
    p.energy_level,
    p.age,
    u.owner_name,
    p.created_at
FROM pets p
JOIN users u ON u.id = p.owner_id
WHERE p.id = $1;