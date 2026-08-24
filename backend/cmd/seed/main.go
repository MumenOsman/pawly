package main

import (
	"fmt"
	"log"

	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"

	"match-me/internal/database"
)

var FIRST_NAMES = []string{
	"Santa", "Mikael", "Aino", "Eero", "Lauri", "Sofia", "Emilia", "Aleksi",
	"Helmi", "Juho", "Kerttu", "Matti", "Noora", "Oskari", "Pinja", "Roope",
	"Salla", "Tuomas", "Venla", "Ville", "Alma", "Eetu", "Iida", "Jere",
}

var LAST_NAMES = []string{
	"Virtanen", "Korhonen", "Nieminen", "Mäkelä", "Hämäläinen", "Laine", "Heikkinen",
	"Koskinen", "Järvinen", "Lehtonen", "Lehtinen", "Saari", "Salminen", "Heinonen",
}

var DOG_NAMES = []string{
	"Poppy", "Luna", "Sisu", "Bella", "Charlie", "Max", "Nala", "Milo", "Daisy",
	"Leo", "Coco", "Rocky", "Lola", "Buddy", "Teddy", "Finn", "Bailey", "Buster",
}

var CAT_NAMES = []string{
	"Misu", "Peto", "Oliver", "Simba", "Chloe", "Cleo", "Felix", "Jasper", "Loki",
	"Mia", "Mitsu", "Oreo", "Penelope", "Smokey", "Willow", "Zelda", "Ziggy",
}

var DOG_BREEDS = []string{
	"French Bulldog", "Golden Retriever", "Labrador Retriever", "Beagle",
	"Poodle", "German Shepherd", "Corgi", "Pug", "Dachshund", "Boxer",
}

var CAT_BREEDS = []string{
	"British Shorthair", "Maine Coon", "Siamese", "Persian", "Ragdoll",
	"Scottish Fold", "Russian Blue", "Sphynx", "Bengal",
}

type NeighborhoodCoords struct {
	Name string
	Lat  float64
	Lng  float64
}

var NEIGHBORHOOD_CENTERS = []NeighborhoodCoords{
	// Uusimaa / Helsinki Region (~45% of users)
	{Name: "Helsinki (Töölö)", Lat: 60.1780, Lng: 24.9250},
	{Name: "Helsinki (Kallio)", Lat: 60.1840, Lng: 24.9530},
	{Name: "Helsinki (Kamppi)", Lat: 60.1670, Lng: 24.9310},
	{Name: "Helsinki (Punavuori)", Lat: 60.1600, Lng: 24.9400},
	{Name: "Helsinki (Kaivopuisto)", Lat: 60.1540, Lng: 24.9550},
	{Name: "Helsinki (Lauttasaari)", Lat: 60.1580, Lng: 24.8830},
	{Name: "Espoo (Tapiola)", Lat: 60.1760, Lng: 24.8050},
	{Name: "Vantaa (Tikkurila)", Lat: 60.2930, Lng: 25.0400},
	{Name: "Helsinki (Pasila)", Lat: 60.1980, Lng: 24.9330},

	// Kuopio Region (~30% of users)
	{Name: "Kuopio (Keskusta)", Lat: 62.8924, Lng: 27.6770},
	{Name: "Kuopio (Puijonlaakso)", Lat: 62.9060, Lng: 27.6520},
	{Name: "Kuopio (Neulamäki)", Lat: 62.8800, Lng: 27.6150},
	{Name: "Kuopio (Saaristokaupunki)", Lat: 62.8450, Lng: 27.7100},
	{Name: "Kuopio (Julkula)", Lat: 62.9250, Lng: 27.6350},
	{Name: "Kuopio (Inkilänmäki)", Lat: 62.9080, Lng: 27.6950},

	// Tampere Region (~10% of users)
	{Name: "Tampere (Keskusta)", Lat: 61.4978, Lng: 23.7610},
	{Name: "Tampere (Pyynikki)", Lat: 61.4920, Lng: 23.7310},

	// Turku Region (~5% of users)
	{Name: "Turku (Keskusta)", Lat: 60.4518, Lng: 22.2666},

	// Oulu Region (~5% of users)
	{Name: "Oulu (Keskusta)", Lat: 65.0124, Lng: 25.4682},

	// Rovaniemi Region (~5% of users)
	{Name: "Rovaniemi (Keskusta)", Lat: 66.5039, Lng: 25.7294},
}

var TEMPERAMENT_SETS = [][]string{
	{"friendly", "playful", "calm"},
	{"energetic", "friendly", "playful"},
	{"calm", "gentle", "friendly"},
	{"curious", "playful", "energetic"},
	{"gentle", "calm", "friendly"},
}

// 40 Verified 100% Domestic Cat Photos (no toys, no treats, no 404s)
var VERIFIED_CAT_PHOTOS = []string{
	"https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1561948955-570b270e7c36?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1513245543132-31f507417b26?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1533743983669-94fa5c4338ec?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1511044568932-338cba0ad803?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1577023311546-acd0767731f0?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1529778873920-4da4926ebefe?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1568152950566-c1bf43f4ab28?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1571566882372-1598d88abd90?w=600&auto=format&fit=crop&q=80",
	"https://images.unsplash.com/photo-1516139008210-96e45dccd83b?w=600&auto=format&fit=crop&q=80",
	"https://placecats.com/neo/600/400",
	"https://placecats.com/millie/600/400",
	"https://placecats.com/bella/600/400",
	"https://placecats.com/poppy/600/400",
	"https://placecats.com/louie/600/400",
	"https://placecats.com/gabella/600/400",
	"https://placecats.com/giles/600/400",
}

func main() {
	log.Println("🌱 Starting Pawly Database Seeder...")

	db, err := database.Connect()
	if err != nil {
		log.Fatalf("❌ Database connection failed: %v", err)
	}
	defer db.Close()

	log.Println("🧹 Cleansing existing tables...")
	_, err = db.Exec(`
		TRUNCATE users, user_profiles, pets, pet_preferences, 
		connection_requests, connections, chats, messages, 
		dismissed_recommendations RESTART IDENTITY CASCADE;
	`)
	if err != nil {
		log.Fatalf("❌ Failed to truncate tables: %v", err)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("❌ Failed to hash password: %v", err)
	}
	passStr := string(hashedPassword)

	tx, err := db.Begin()
	if err != nil {
		log.Fatalf("❌ Failed to begin transaction: %v", err)
	}
	defer tx.Rollback()

	dogPhotoIdx := 1
	catPhotoIdx := 0
	petDistribution := []int{1, 1, 1, 1, 1, 1, 1, 2, 2, 3}
	totalPetsCount := 0

	log.Println("👤 Generating 100 Users, Profiles & Pets with verified photos...")
	for userID := 1; userID <= 100; userID++ {
		firstName := FIRST_NAMES[(userID-1)%len(FIRST_NAMES)]
		lastName := LAST_NAMES[(userID-1)%len(LAST_NAMES)]
		ownerName := fmt.Sprintf("%s %s", firstName, lastName)
		email := fmt.Sprintf("user%d@pawly.com", userID)

		center := NEIGHBORHOOD_CENTERS[(userID-1)%len(NEIGHBORHOOD_CENTERS)]
		location := center.Name
		ownerPhoto := fmt.Sprintf("https://i.pravatar.cc/150?u=pawly_user_%d", userID)
		if userID == 1 {
			ownerPhoto = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80"
		}
		userBio := fmt.Sprintf("Hey, this is %s! I live in %s and love outdoor walks with my pets.", firstName, location)

		_, err := tx.Exec(`
			INSERT INTO users (id, email, password_hash, owner_name)
			VALUES ($1, $2, $3, $4);
		`, userID, email, passStr, ownerName)
		if err != nil {
			log.Fatalf("❌ Failed inserting user %d: %v", userID, err)
		}

		_, err = tx.Exec(`
			INSERT INTO user_profiles (user_id, owner_name, owner_photo, about_me, location, interests)
			VALUES ($1, $2, $3, $4, $5, $6);
		`, userID, ownerName, ownerPhoto, userBio, location, pq.Array([]string{"Hiking", "Pets", "Coffee"}))
		if err != nil {
			log.Fatalf("❌ Failed inserting profile %d: %v", userID, err)
		}

		numPets := petDistribution[(userID-1)%len(petDistribution)]
		if userID == 1 {
			numPets = 2 // Test user 1 gets 2 pets (Poppy & Misu) for multi-pet testing
		}

		for p := 0; p < numPets; p++ {
			totalPetsCount++
			petID := totalPetsCount

			animalType := "dog"
			if (petID % 2) == 0 {
				animalType = "cat"
			}

			var petName, breed, petPhoto string
			if animalType == "dog" {
				petName = DOG_NAMES[(petID-1)%len(DOG_NAMES)]
				breed = DOG_BREEDS[(petID-1)%len(DOG_BREEDS)]

				// placedog.net guaranteed real dog photo (ID 1..150)
				petPhoto = fmt.Sprintf("https://placedog.net/600/400?id=%d", dogPhotoIdx)
				dogPhotoIdx++
			} else {
				petName = CAT_NAMES[(petID-1)%len(CAT_NAMES)]
				breed = CAT_BREEDS[(petID-1)%len(CAT_BREEDS)]

				// Verified domestic cat photos
				baseCat := VERIFIED_CAT_PHOTOS[catPhotoIdx%len(VERIFIED_CAT_PHOTOS)]
				if catPhotoIdx >= len(VERIFIED_CAT_PHOTOS) {
					petPhoto = fmt.Sprintf("%s?cat_id=%d", baseCat, catPhotoIdx)
				} else {
					petPhoto = baseCat
				}
				catPhotoIdx++
			}

			sizes := []string{"small", "medium", "large"}
			size := sizes[(petID-1)%len(sizes)]
			energies := []string{"low", "medium", "high"}
			energyLevel := energies[(petID-1)%len(energies)]
			petAge := ((petID - 1) % 8) + 1
			temperaments := TEMPERAMENT_SETS[(petID-1)%len(TEMPERAMENT_SETS)]
			petBio := fmt.Sprintf("%s is a friendly %s who loves exploring parks in %s.", petName, breed, location)

			// Tight land-snapped GPS coordinates centered around land neighborhood center
			lat := center.Lat + (float64(p)*0.0004 - 0.0002)
			lng := center.Lng + (float64(p)*0.0006 - 0.0003)

			_, err = tx.Exec(`
				INSERT INTO pets (
					id, owner_id, pet_name, animal_type, breed, size, about_me, 
					pet_photo, energy_level, pet_age, temperament, latitude, longitude
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
			`, petID, userID, petName, animalType, breed, size, petBio, petPhoto, energyLevel, petAge, pq.Array(temperaments), lat, lng)
			if err != nil {
				log.Fatalf("❌ Failed inserting pet %d: %v", petID, err)
			}

			_, err = tx.Exec(`
				INSERT INTO pet_preferences (
					pet_id, preferred_sizes, preferred_animal_types, preferred_energy_levels, max_distance_km
				) VALUES ($1, $2, $3, $4, $5);
			`, petID, pq.Array([]string{"small", "medium", "large"}), pq.Array([]string{"dog", "cat"}), pq.Array([]string{"low", "medium", "high"}), 15.0)
			if err != nil {
				log.Fatalf("❌ Failed inserting pet preferences for pet %d: %v", petID, err)
			}
		}
	}

	log.Println("💬 Seeding 3 connections and message threads for Test User 1 (Santa Virtanen)...")

	// Connection 1: Pet 1 (Poppy) & Pet 3 (Luna - owned by User 2 Mikael Korhonen)
	var conn1ID int
	err = tx.QueryRow(`
		INSERT INTO connections (pet1_id, pet2_id) VALUES (1, 3) RETURNING id;
	`).Scan(&conn1ID)
	if err == nil {
		var chat1ID int
		err = tx.QueryRow(`INSERT INTO chats (connection_id) VALUES ($1) RETURNING id;`, conn1ID).Scan(&chat1ID)
		if err == nil {
			_, _ = tx.Exec(`INSERT INTO messages (chat_id, sender_user_id, body, created_at) VALUES 
				($1, 2, 'Hi Santa! 👋 Poppy looks so friendly. Would you and Poppy like to set up a playdate at Töölö dog park this weekend?', NOW() - INTERVAL '3 hours'),
				($1, 1, 'Hey Mikael! That sounds awesome. Poppy loves running around at Töölö park. Is Saturday afternoon around 2 PM good for you?', NOW() - INTERVAL '2 hours'),
				($1, 2, 'Saturday at 2 PM works great for Luna and me! See you near the agility area.', NOW() - INTERVAL '1 hour'),
				($1, 1, 'Perfect, see you then! 🐾', NOW() - INTERVAL '30 minutes');
			`, chat1ID)
		}
	}

	// Connection 2: Pet 2 (Misu) & Pet 4 (Peto - owned by User 3 Aino Nieminen)
	var conn2ID int
	err = tx.QueryRow(`
		INSERT INTO connections (pet1_id, pet2_id) VALUES (2, 4) RETURNING id;
	`).Scan(&conn2ID)
	if err == nil {
		var chat2ID int
		err = tx.QueryRow(`INSERT INTO chats (connection_id) VALUES ($1) RETURNING id;`, conn2ID).Scan(&chat2ID)
		if err == nil {
			_, _ = tx.Exec(`INSERT INTO messages (chat_id, sender_user_id, body, created_at) VALUES 
				($1, 1, 'Hi Aino! 👋 I saw Peto on Discover. Misu is also super curious and loves indoor climbing towers!', NOW() - INTERVAL '5 hours'),
				($1, 3, 'Hello Santa! Peto is always looking for feline buddies. How old is Misu?', NOW() - INTERVAL '4 hours'),
				($1, 1, 'Misu is 2 years old and very playful! We should definitely organize a cat play session.', NOW() - INTERVAL '3 hours'),
				($1, 3, 'That would be lovely! Let''s arrange it soon.', NOW() - INTERVAL '2 hours');
			`, chat2ID)
		}
	}

	// Connection 3: Pet 1 (Poppy) & Pet 5 (Bella - owned by User 4 Eero Mäkelä)
	var conn3ID int
	err = tx.QueryRow(`
		INSERT INTO connections (pet1_id, pet2_id) VALUES (1, 5) RETURNING id;
	`).Scan(&conn3ID)
	if err == nil {
		var chat3ID int
		err = tx.QueryRow(`INSERT INTO chats (connection_id) VALUES ($1) RETURNING id;`, conn3ID).Scan(&chat3ID)
		if err == nil {
			_, _ = tx.Exec(`INSERT INTO messages (chat_id, sender_user_id, body, created_at) VALUES 
				($1, 4, 'Hey Santa! Saw Poppy on the map near Kamppi. Bella loves playing fetch if you''re ever around Kaivopuisto!', NOW() - INTERVAL '1 day'),
				($1, 1, 'Hi Eero! We visit Kaivopuisto quite often on Sunday mornings. We''d love to join!', NOW() - INTERVAL '20 hours'),
				($1, 4, 'Awesome, drop me a message next Sunday when you head out!', NOW() - INTERVAL '18 hours');
			`, chat3ID)
		}
	}

	log.Println("🌟 Seeding Dedicated Tester Accounts: Maria Koskinen, Aino Virtanen, Mikko Korhonen...")

	// 1. Insert Maria Koskinen (106)
	_, err = tx.Exec(`
		INSERT INTO users (id, email, password_hash, owner_name, username, date_of_birth)
		VALUES (106, 'maria_k2026@pawly.fi', $1, 'Maria Koskinen', 'maria_k2026', '1995-06-15')
		ON CONFLICT (id) DO UPDATE SET 
			email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, 
			owner_name = EXCLUDED.owner_name, username = EXCLUDED.username, date_of_birth = EXCLUDED.date_of_birth;
	`, passStr)
	if err != nil {
		log.Fatalf("Failed seeding Maria user: %v", err)
	}

	_, _ = tx.Exec(`
		INSERT INTO user_profiles (user_id, owner_name, owner_photo, about_me, location, interests, date_of_birth)
		VALUES (106, 'Maria Koskinen', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80', 'Hi! I am Maria, living in Töölö with Bella. We love weekend agility training and discovering new dog parks across Helsinki.', 'Helsinki (Töölö)', ARRAY['Dog Walking', 'Agility Training', 'Outdoor Hiking', 'Park Hangouts'], '1995-06-15')
		ON CONFLICT (user_id) DO UPDATE SET
			owner_name = EXCLUDED.owner_name, owner_photo = EXCLUDED.owner_photo,
			about_me = EXCLUDED.about_me, location = EXCLUDED.location,
			interests = EXCLUDED.interests, date_of_birth = EXCLUDED.date_of_birth;
	`)

	_, _ = tx.Exec(`
		INSERT INTO pets (id, owner_id, pet_name, animal_type, breed, size, about_me, pet_photo, photos, energy_level, pet_age, temperament, latitude, longitude)
		VALUES (106, 106, 'Bella', 'dog', 'Golden Retriever', 'large', 'Always ready for swimming, fetch games, and puppy playdates!', 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&auto=format&fit=crop&q=80', ARRAY['https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&auto=format&fit=crop&q=80'], 'high', 2, ARRAY['Playful', 'Friendly', 'Energetic'], 60.1812, 24.9220)
		ON CONFLICT (id) DO UPDATE SET
			pet_name = EXCLUDED.pet_name, animal_type = EXCLUDED.animal_type, breed = EXCLUDED.breed,
			size = EXCLUDED.size, about_me = EXCLUDED.about_me, pet_photo = EXCLUDED.pet_photo,
			photos = EXCLUDED.photos, energy_level = EXCLUDED.energy_level, pet_age = EXCLUDED.pet_age,
			temperament = EXCLUDED.temperament, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
	`)

	// 2. Insert Aino Virtanen (110)
	_, err = tx.Exec(`
		INSERT INTO users (id, email, password_hash, owner_name, username, date_of_birth)
		VALUES (110, 'aino@pawly.fi', $1, 'Aino Virtanen', 'aino_v', '1998-04-12')
		ON CONFLICT (id) DO UPDATE SET 
			email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, 
			owner_name = EXCLUDED.owner_name, username = EXCLUDED.username, date_of_birth = EXCLUDED.date_of_birth;
	`, passStr)
	if err != nil {
		log.Fatalf("Failed seeding Aino user: %v", err)
	}

	_, _ = tx.Exec(`
		INSERT INTO user_profiles (user_id, owner_name, owner_photo, about_me, location, interests, date_of_birth)
		VALUES (110, 'Aino Virtanen', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80', 'Architect living in Kallio. Milo is my chill companion on daily cafe walks and photography strolls.', 'Helsinki (Kallio)', ARRAY['Park Hangouts', 'Pet Photography', 'Pet Cafes', 'Camping'], '1998-04-12')
		ON CONFLICT (user_id) DO UPDATE SET
			owner_name = EXCLUDED.owner_name, owner_photo = EXCLUDED.owner_photo,
			about_me = EXCLUDED.about_me, location = EXCLUDED.location,
			interests = EXCLUDED.interests, date_of_birth = EXCLUDED.date_of_birth;
	`)

	_, _ = tx.Exec(`
		INSERT INTO pets (id, owner_id, pet_name, animal_type, breed, size, about_me, pet_photo, photos, energy_level, pet_age, temperament, latitude, longitude)
		VALUES (110, 110, 'Milo', 'dog', 'French Bulldog', 'small', 'Low energy snuggler who enjoys short park walks and sunbathing.', 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500&auto=format&fit=crop&q=80', ARRAY['https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500&auto=format&fit=crop&q=80'], 'low', 3, ARRAY['Calm', 'Gentle', 'Couch Potato'], 60.1873, 24.9535)
		ON CONFLICT (id) DO UPDATE SET
			pet_name = EXCLUDED.pet_name, animal_type = EXCLUDED.animal_type, breed = EXCLUDED.breed,
			size = EXCLUDED.size, about_me = EXCLUDED.about_me, pet_photo = EXCLUDED.pet_photo,
			photos = EXCLUDED.photos, energy_level = EXCLUDED.energy_level, pet_age = EXCLUDED.pet_age,
			temperament = EXCLUDED.temperament, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
	`)

	// 3. Insert Mikko Korhonen (111)
	_, err = tx.Exec(`
		INSERT INTO users (id, email, password_hash, owner_name, username, date_of_birth)
		VALUES (111, 'mikko@pawly.fi', $1, 'Mikko Korhonen', 'mikko_k', '1991-09-20')
		ON CONFLICT (id) DO UPDATE SET 
			email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, 
			owner_name = EXCLUDED.owner_name, username = EXCLUDED.username, date_of_birth = EXCLUDED.date_of_birth;
	`, passStr)
	if err != nil {
		log.Fatalf("Failed seeding Mikko user: %v", err)
	}

	_, _ = tx.Exec(`
		INSERT INTO user_profiles (user_id, owner_name, owner_photo, about_me, location, interests, date_of_birth)
		VALUES (111, 'Mikko Korhonen', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80', 'Software engineer in Tapiola. Luna and I are big fans of coastal trails, frisbee sessions, and trick training.', 'Espoo (Tapiola)', ARRAY['Beach Walks', 'Puppy Socialization', 'Outdoor Hiking', 'Trick Training'], '1991-09-20')
		ON CONFLICT (user_id) DO UPDATE SET
			owner_name = EXCLUDED.owner_name, owner_photo = EXCLUDED.owner_photo,
			about_me = EXCLUDED.about_me, location = EXCLUDED.location,
			interests = EXCLUDED.interests, date_of_birth = EXCLUDED.date_of_birth;
	`)

	_, _ = tx.Exec(`
		INSERT INTO pets (id, owner_id, pet_name, animal_type, breed, size, about_me, pet_photo, photos, energy_level, pet_age, temperament, latitude, longitude)
		VALUES (111, 111, 'Luna', 'dog', 'Border Collie', 'medium', 'Super energetic agility star! Loves Frisbee and mental challenge games.', 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=500&auto=format&fit=crop&q=80', ARRAY['https://images.unsplash.com/photo-1517849845537-4d257902454a?w=500&auto=format&fit=crop&q=80'], 'high', 4, ARRAY['Energetic', 'Intelligent', 'Playful'], 60.1770, 24.8055)
		ON CONFLICT (id) DO UPDATE SET
			pet_name = EXCLUDED.pet_name, animal_type = EXCLUDED.animal_type, breed = EXCLUDED.breed,
			size = EXCLUDED.size, about_me = EXCLUDED.about_me, pet_photo = EXCLUDED.pet_photo,
			photos = EXCLUDED.photos, energy_level = EXCLUDED.energy_level, pet_age = EXCLUDED.pet_age,
			temperament = EXCLUDED.temperament, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
	`)

	// 4. Inter-user Connections between Maria (106), Aino (110), Mikko (111)
	_, _ = tx.Exec(`
		INSERT INTO connections (id, pet1_id, pet2_id)
		VALUES 
		(101, 106, 110),
		(102, 106, 111),
		(103, 110, 111)
		ON CONFLICT (id) DO NOTHING;

		INSERT INTO chats (id, connection_id)
		VALUES 
		(101, 101),
		(102, 102),
		(103, 103)
		ON CONFLICT (id) DO NOTHING;

		INSERT INTO messages (chat_id, sender_user_id, body, created_at, read_at) VALUES
		(101, 106, 'Moi Aino! Bella would love to meet Milo at the Töölönlahti park sometime this week.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),
		(101, 110, 'Moi Maria! That sounds super nice. Milo is usually most active in the early evening around 18:00.', NOW() - INTERVAL '2 days' + INTERVAL '1 hour', NOW() - INTERVAL '2 days' + INTERVAL '1 hour' + INTERVAL '2 minutes'),
		(101, 106, 'Thursday at 18:00 works perfectly for us! See you near the amphitheatre grass area 🐾', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '10 minutes'),
		(101, 110, 'Great! We will be there. Bringing some treats too!', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours'),

		(102, 111, 'Hei Maria! Saw Bella loves agility. Luna and I go to the agility park near Rajasaari often!', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '15 minutes'),
		(102, 106, 'Hei Mikko! Yes, Bella is obsessed with tunnel runs and hurdles. How fast is Luna on the weave poles?', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '20 minutes'),
		(102, 111, 'Haha, she is lightning fast! We should set up a joint practice run this weekend if weather permits.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes'),
		(102, 106, 'Sunday morning would be awesome! Let us check the forecast closer to Saturday.', NOW() - INTERVAL '3 hours', NULL),

		(103, 110, 'Moi Mikko, is Luna good with smaller calm dogs like frenchies?', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '1 hour'),
		(103, 111, 'Moi Aino! Yes absolutely, Luna is very gentle when playing with smaller buddies. She just matches their tempo.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '45 minutes'),
		(103, 110, 'Awesome, Milo is super chill and loves just walking alongside other dogs without excessive jumping.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '10 minutes');

		SELECT setval('users_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM users), 1), 112));
		SELECT setval('pets_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM pets), 1), 112));
		SELECT setval('connections_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM connections), 1), 104));
		SELECT setval('chats_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM chats), 1), 104));
		SELECT setval('messages_id_seq', COALESCE((SELECT MAX(id) FROM messages), 1));
	`)

	if err := tx.Commit(); err != nil {
		log.Fatalf("❌ Transaction commit failed: %v", err)
	}

	log.Println("==========================================================")
	log.Printf("✅ SUCCESS! Cleansed database and seeded 100 Users, %d Pets, 3 Connections & Chat Threads!\n", totalPetsCount)
	log.Println("==========================================================")
}
