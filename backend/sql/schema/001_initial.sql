-- Pawly Database Schema
-- Run this file to create all tables:
--   psql -U postgres -d pawly -f 001_initial.sql

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    owner_name    VARCHAR(255) NOT NULL DEFAULT '',
    username      VARCHAR(100) NOT NULL DEFAULT '',
    date_of_birth VARCHAR(50) DEFAULT '',
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- USER PROFILES (one per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    owner_name    VARCHAR(255) NOT NULL DEFAULT '',
    owner_photo   VARCHAR(500) DEFAULT '',
    about_me      TEXT DEFAULT '',
    location      VARCHAR(255) DEFAULT '',
    interests     TEXT[] DEFAULT '{}',
    date_of_birth VARCHAR(50) DEFAULT '',
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PETS (a user can own multiple pets)
-- ============================================================
CREATE TABLE IF NOT EXISTS pets (
    id           SERIAL PRIMARY KEY,
    owner_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_name     VARCHAR(255) NOT NULL,
    animal_type  VARCHAR(50) NOT NULL,           -- dog, cat, rabbit, small_pet
    breed        VARCHAR(100) DEFAULT '',
    size         VARCHAR(20) NOT NULL,            -- small, medium, large
    about_me     TEXT DEFAULT '',
    pet_photo    VARCHAR(500) DEFAULT '',
    photos       TEXT[] DEFAULT '{}',
    energy_level VARCHAR(20) NOT NULL,            -- low, medium, high
    pet_age      INTEGER DEFAULT 0,
    temperament  TEXT[] DEFAULT '{}',              -- e.g. {friendly, playful, calm}
    latitude     DOUBLE PRECISION DEFAULT 60.1699,
    longitude    DOUBLE PRECISION DEFAULT 24.9384,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PET PREFERENCES (what kind of playmate this pet wants)
-- ============================================================
CREATE TABLE IF NOT EXISTS pet_preferences (
    pet_id                   INTEGER PRIMARY KEY REFERENCES pets(id) ON DELETE CASCADE,
    preferred_sizes          TEXT[] DEFAULT '{}',
    preferred_animal_types   TEXT[] DEFAULT '{}',
    preferred_energy_levels  TEXT[] DEFAULT '{}',
    max_distance_km          DOUBLE PRECISION DEFAULT 10
);

-- ============================================================
-- CONNECTION REQUESTS (pending invitations between pets)
-- ============================================================
CREATE TABLE IF NOT EXISTS connection_requests (
    id              SERIAL PRIMARY KEY,
    sender_pet_id   INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    receiver_pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, accepted, dismissed
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sender_pet_id, receiver_pet_id)
);

-- ============================================================
-- CONNECTIONS (accepted relationships between pets)
-- ============================================================
CREATE TABLE IF NOT EXISTS connections (
    id         SERIAL PRIMARY KEY,
    pet1_id    INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    pet2_id    INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pet1_id, pet2_id)
);

-- ============================================================
-- CHATS (one chat per connection)
-- ============================================================
CREATE TABLE IF NOT EXISTS chats (
    id            SERIAL PRIMARY KEY,
    connection_id INTEGER UNIQUE NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id             SERIAL PRIMARY KEY,
    chat_id        INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body           TEXT NOT NULL,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at        TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- DISMISSED RECOMMENDATIONS (so they don't reappear)
-- ============================================================
CREATE TABLE IF NOT EXISTS dismissed_recommendations (
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id       INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY(user_id, pet_id)
);

-- ============================================================
-- INDEXES for common query patterns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_pets_animal_type ON pets(animal_type);
CREATE INDEX IF NOT EXISTS idx_connection_requests_receiver ON connection_requests(receiver_pet_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_sender ON connection_requests(sender_pet_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
