CREATE TABLE pet_preferences (
    pet_id BIGINT PRIMARY KEY REFERENCES pets(id) ON DELETE CASCADE,
    preferred_sizes TEXT [],
    preferred_animal_types TEXT [],
    preferred_energy_levels TEXT [],

    min_age INTEGER,
    max_age INTEGER,
    
    max_distance_km INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)