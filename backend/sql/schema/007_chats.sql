CREATE TABLE chats (
    id BIGSERIAL PRIMARY KEY,

    pet1_id BIGINT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    pet2_id BIGINT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (pet1_id <> pet2_id),

    UNIQUE (pet1_id, pet2_id)
);