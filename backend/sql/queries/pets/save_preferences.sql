INSERT INTO pet_preferences (
    pet_id,
    preferred_sizes,
    preferred_animal_types,
    preferred_energy_levels,
    min_age,
    max_age,
    max_distance_km
)
VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
ON CONFLICT (pet_id)
DO UPDATE SET
    preferred_sizes = EXCLUDED.preferred_sizes,
    preferred_animal_types = EXCLUDED.preferred_animal_types,
    preferred_energy_levels = EXCLUDED.preferred_energy_levels,
    min_age = EXCLUDED.min_age,
    max_age = EXCLUDED.max_age,
    max_distance_km = EXCLUDED.max_distance_km
RETURNING *;