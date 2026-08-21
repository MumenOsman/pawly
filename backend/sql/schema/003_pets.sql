CREATE TABLE pets(
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_name TEXT NOT NULL,
    animal_type TEXT NOT NULL,
    size TEXT,
    about_me TEXT,
    photo_url TEXT,
    energy_level TEXT,
    age INTEGER,
    location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)