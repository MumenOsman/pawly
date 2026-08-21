INSERT INTO pets (
    owner_id,
    pet_name,
    animal_type,
    size,
    about_me,
    photo_url,
    energy_level,
    age,
    location
)
VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    ST_MakePoint($9, $10)::geography
)
RETURNING
    id,
    owner_id,
    pet_name,
    animal_type,
    size,
    about_me,
    photo_url,
    energy_level,
    age,
    created_at;