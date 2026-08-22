CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    owner_name TEXT NOT NULL DEFAULT '',
    username TEXT NOT NULL DEFAULT '',
    date_of_birth TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);