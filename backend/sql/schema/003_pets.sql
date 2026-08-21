CREATE TABLE pets(
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_name VARCHAR(255) NOT NULL,
    animal_type VARCHAR(50) NOT NULL,
    breed VARCHAR(100) DEFAULT '',
    size VARCHAR(20) NOT NULL,
    about_me TEXT DEFAULT '',
    pet_photo VARCHAR(500) DEFAULT '',
    photos TEXT[] DEFAULT '{}',
    energy_level VARCHAR(20) NOT NULL,
    pet_age INTEGER DEFAULT 0,
    temperament TEXT[] DEFAULT '{}',
    latitude DOUBLE PRECISION DEFAULT 60.1699,
    longitude DOUBLE PRECISION DEFAULT 24.9384,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);