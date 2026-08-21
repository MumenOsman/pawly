BEGIN;

UPDATE connection_requests
SET status = 'accepted'
WHERE sender_pet_id = $1
  AND receiver_pet_id = $2;

INSERT INTO connections (
    pet1_id,
    pet2_id
)
VALUES (
    LEAST($1, $2),
    GREATEST($1, $2)
);

INSERT INTO chats (
    pet1_id,
    pet2_id
)
VALUES (
    LEAST($1, $2),
    GREATEST($1, $2)
)
ON CONFLICT DO NOTHING;

COMMIT;