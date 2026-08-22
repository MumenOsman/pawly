CREATE TABLE user_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    owner_name TEXT NOT NULL DEFAULT '',
    owner_photo TEXT DEFAULT '',
    about_me TEXT DEFAULT '',
    location TEXT DEFAULT '',
    interests TEXT[] DEFAULT '{}',
    date_of_birth TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);