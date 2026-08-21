SELECT p.id,
    p.pet_name,
    p.animal_type,
    p.size,
    p.energy_level,
    p.age,
    p.photo_url,
    ROUND(
        ST_Distance(
            p.location,
            ST_MakePoint($1, $2)::geography
        ) / 1000.0,
        1
    ) AS km_away
FROM pets p
WHERE p.id <> $3
    AND ST_DWithin(
        p.location,
        ST_MakePoint($1, $2)::geography,
        $4
    )
ORDER BY km_away
LIMIT 100;