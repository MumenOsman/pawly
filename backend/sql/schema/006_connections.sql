CREATE TABLE connections (
    pet1_id BIGINT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    pet2_id BIGINT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (pet1_id, pet2_id),

    CHECK (pet1_id <> pet2_id)
);