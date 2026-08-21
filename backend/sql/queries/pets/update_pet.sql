UPDATE pets
SET
    pet_name = $2,
    animal_type = $3,
    size = $4,
    about_me = $5,
    photo_url = $6,
    energy_level = $7,
    age = $8
WHERE id = $1
RETURNING *;