CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,

    chat_id BIGINT NOT NULL
        REFERENCES chats(id) ON DELETE CASCADE,

    sender_pet_id BIGINT NOT NULL
        REFERENCES pets(id) ON DELETE CASCADE,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);