CREATE TABLE connection_requests (
    id BIGSERIAL PRIMARY KEY,

    sender_pet_id BIGINT NOT NULL
        REFERENCES pets(id) ON DELETE CASCADE,

    receiver_pet_id BIGINT NOT NULL
        REFERENCES pets(id) ON DELETE CASCADE,

    status TEXT NOT NULL DEFAULT 'pending',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (sender_pet_id <> receiver_pet_id),

    UNIQUE (sender_pet_id, receiver_pet_id)
);