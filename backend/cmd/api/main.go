package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"match-me/internal/database"
	"match-me/internal/handlers"
	"match-me/internal/middleware"
)

func main() {
	port := getEnv("SERVER_PORT", "3000")
	jwtSecret := getEnv("JWT_SECRET", "dev-secret-change-me")

	// --- Database connection ---
	db, err := database.Connect()
	if err != nil {
		log.Printf("⚠️  Database not connected: %v", err)
		log.Println("   Auth and data endpoints will return 503 until DB is available.")
		log.Println("   The /debug page will show connection status.")
	}
	if db != nil {
		defer db.Close()
		log.Println("✅ Database connected successfully")

		// Ensure extra user & pet columns exist
		_, _ = db.Exec(`
			ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) DEFAULT '';
			ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(50) DEFAULT '';
			ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(50) DEFAULT '';

			ALTER TABLE pets ADD COLUMN IF NOT EXISTS breed VARCHAR(100) DEFAULT '';
			ALTER TABLE pets ADD COLUMN IF NOT EXISTS pet_photo VARCHAR(500) DEFAULT '';
			ALTER TABLE pets ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
			ALTER TABLE pets ADD COLUMN IF NOT EXISTS pet_age INTEGER DEFAULT 0;
			ALTER TABLE pets ADD COLUMN IF NOT EXISTS temperament TEXT[] DEFAULT '{}';
			ALTER TABLE pets ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT 60.1699;
			ALTER TABLE pets ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT 24.9384;

			-- Delete faulty / empty test users
			DELETE FROM users WHERE id IN (101, 102, 103, 104, 105, 107, 108, 109, 112);
			DELETE FROM users WHERE username = '' AND id > 100;

			-- Populate clean usernames for seeded users 1-100 if empty
			UPDATE users 
			SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(owner_name, ' ', 1), '[^a-zA-Z0-9]', '', 'g')) || '_' || id
			WHERE (username = '' OR username IS NULL) AND id <= 100;

			-- 1. Ensure User Profiles for Maria (106), Aino (110), Mikko (111)
			INSERT INTO user_profiles (user_id, owner_name, owner_photo, about_me, location, interests, date_of_birth)
			VALUES 
			(106, 'Maria Koskinen', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80', 'Hi! I am Maria, living in Töölö with Bella. We love weekend agility training and discovering new dog parks across Helsinki.', 'Helsinki (Töölö)', ARRAY['Dog Walking', 'Agility Training', 'Outdoor Hiking', 'Park Hangouts'], '1995-06-15'),
			(110, 'Aino Virtanen', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80', 'Architect living in Kallio. Milo is my chill companion on daily cafe walks and photography strolls.', 'Helsinki (Kallio)', ARRAY['Park Hangouts', 'Pet Photography', 'Pet Cafes', 'Camping'], '1998-04-12'),
			(111, 'Mikko Korhonen', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80', 'Software engineer in Tapiola. Luna and I are big fans of coastal trails, frisbee sessions, and trick training.', 'Espoo (Tapiola)', ARRAY['Beach Walks', 'Puppy Socialization', 'Outdoor Hiking', 'Trick Training'], '1991-09-20')
			ON CONFLICT (user_id) DO UPDATE SET
				owner_name = EXCLUDED.owner_name,
				owner_photo = EXCLUDED.owner_photo,
				about_me = EXCLUDED.about_me,
				location = EXCLUDED.location,
				interests = EXCLUDED.interests,
				date_of_birth = EXCLUDED.date_of_birth;

			-- 2. Ensure Pets for Maria (106), Aino (110), Mikko (111)
			DELETE FROM pets WHERE owner_id IN (106, 110, 111) OR id = 1111;

			INSERT INTO pets (id, owner_id, pet_name, animal_type, breed, size, about_me, pet_photo, photos, energy_level, pet_age, temperament, latitude, longitude)
			VALUES 
			(106, 106, 'Bella', 'dog', 'Golden Retriever', 'large', 'Always ready for swimming, fetch games, and puppy playdates!', 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&auto=format&fit=crop&q=80', ARRAY['https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&auto=format&fit=crop&q=80'], 'high', 2, ARRAY['Playful', 'Friendly', 'Energetic'], 60.1812, 24.9220),
			(110, 110, 'Milo', 'dog', 'French Bulldog', 'small', 'Low energy snuggler who enjoys short park walks and sunbathing.', 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500&auto=format&fit=crop&q=80', ARRAY['https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500&auto=format&fit=crop&q=80'], 'low', 3, ARRAY['Calm', 'Gentle', 'Couch Potato'], 60.1873, 24.9535),
			(111, 111, 'Luna', 'dog', 'Border Collie', 'medium', 'Super energetic agility star! Loves Frisbee and mental challenge games.', 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=500&auto=format&fit=crop&q=80', ARRAY['https://images.unsplash.com/photo-1517849845537-4d257902454a?w=500&auto=format&fit=crop&q=80'], 'high', 4, ARRAY['Energetic', 'Intelligent', 'Playful'], 60.1770, 24.8055)
			ON CONFLICT (id) DO UPDATE SET
				pet_name = EXCLUDED.pet_name,
				animal_type = EXCLUDED.animal_type,
				breed = EXCLUDED.breed,
				size = EXCLUDED.size,
				about_me = EXCLUDED.about_me,
				pet_photo = EXCLUDED.pet_photo,
				photos = EXCLUDED.photos,
				energy_level = EXCLUDED.energy_level,
				pet_age = EXCLUDED.pet_age,
				temperament = EXCLUDED.temperament,
				latitude = EXCLUDED.latitude,
				longitude = EXCLUDED.longitude;

			-- Synchronize pets_id_seq sequence
			SELECT setval('pets_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM pets), 1), 1112));

			-- 3. Ensure Inter-user Connections between Maria (106), Aino (110), Mikko (111)
			INSERT INTO connections (id, pet1_id, pet2_id)
			VALUES 
			(101, 106, 110),
			(102, 106, 111),
			(103, 110, 111)
			ON CONFLICT (id) DO NOTHING;

			SELECT setval('connections_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM connections), 1), 104));

			-- 4. Ensure Chats exist for these connections
			INSERT INTO chats (id, connection_id)
			VALUES 
			(101, 101),
			(102, 102),
			(103, 103)
			ON CONFLICT (id) DO NOTHING;

			SELECT setval('chats_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM chats), 1), 104));

			-- 5. Seed realistic chat histories
			DELETE FROM messages WHERE chat_id IN (101, 102, 103);

			-- Chat 101: Maria (106) & Aino (110)
			INSERT INTO messages (chat_id, sender_user_id, body, created_at, read_at) VALUES
			(101, 106, 'Moi Aino! Bella would love to meet Milo at the Töölönlahti park sometime this week.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),
			(101, 110, 'Moi Maria! That sounds super nice. Milo is usually most active in the early evening around 18:00.', NOW() - INTERVAL '2 days' + INTERVAL '1 hour', NOW() - INTERVAL '2 days' + INTERVAL '1 hour' + INTERVAL '2 minutes'),
			(101, 106, 'Thursday at 18:00 works perfectly for us! See you near the amphitheatre grass area 🐾', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '10 minutes'),
			(101, 110, 'Great! We will be there. Bringing some treats too!', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours');

			-- Chat 102: Maria (106) & Mikko (111)
			INSERT INTO messages (chat_id, sender_user_id, body, created_at, read_at) VALUES
			(102, 111, 'Hei Maria! Saw Bella loves agility. Luna and I go to the agility park near Rajasaari often!', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '15 minutes'),
			(102, 106, 'Hei Mikko! Yes, Bella is obsessed with tunnel runs and hurdles. How fast is Luna on the weave poles?', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '20 minutes'),
			(102, 111, 'Haha, she is lightning fast! We should set up a joint practice run this weekend if weather permits.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes'),
			(102, 106, 'Sunday morning would be awesome! Let us check the forecast closer to Saturday.', NOW() - INTERVAL '3 hours', NULL);

			-- Chat 103: Aino (110) & Mikko (111)
			INSERT INTO messages (chat_id, sender_user_id, body, created_at, read_at) VALUES
			(103, 110, 'Moi Mikko, is Luna good with smaller calm dogs like frenchies?', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '1 hour'),
			(103, 111, 'Moi Aino! Yes absolutely, Luna is very gentle when playing with smaller buddies. She just matches their tempo.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '45 minutes'),
			(103, 110, 'Awesome, Milo is super chill and loves just walking alongside other dogs without excessive jumping.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '10 minutes');

			SELECT setval('messages_id_seq', COALESCE((SELECT MAX(id) FROM messages), 1));
		`)
	}

	// --- Handlers & Router ---
	h := handlers.New(db, jwtSecret)
	mux := http.NewServeMux()

	// Public routes
	mux.HandleFunc("POST /auth/register", h.Register)
	mux.HandleFunc("POST /auth/login", h.Login)
	mux.HandleFunc("GET /health", h.HealthCheck)
	mux.HandleFunc("GET /test", h.TestPage)
	mux.HandleFunc("GET /debug", h.DebugPage)
	mux.HandleFunc("GET /uploads/", h.ServeUploads)
	mux.HandleFunc("POST /upload", h.UploadFile)

	// Protected routes (require JWT)
	protected := http.NewServeMux()
	protected.HandleFunc("GET /me", h.Me)
	protected.HandleFunc("GET /me/profile", h.GetProfile)
	protected.HandleFunc("PUT /me/profile", h.UpdateProfile)
	protected.HandleFunc("GET /users/{id}", h.GetUser)
	protected.HandleFunc("PUT /users/{id}", h.UpdateUser)

	// Pets
	protected.HandleFunc("GET /pets/me", h.GetMyPets)
	protected.HandleFunc("POST /pets", h.CreatePet)
	protected.HandleFunc("GET /pets/{id}", h.GetPet)
	protected.HandleFunc("PUT /pets/{id}", h.UpdatePet)
	protected.HandleFunc("DELETE /pets/{id}", h.DeletePet)
	protected.HandleFunc("GET /pets/{id}/preferences", h.GetPetPreferences)
	protected.HandleFunc("PUT /pets/{id}/preferences", h.SavePetPreferences)

	// Recommendations
	protected.HandleFunc("GET /recommendations", h.GetRecommendations)
	protected.HandleFunc("POST /recommendations/{id}/dismiss", h.DismissRecommendation)

	// Connections & Requests
	protected.HandleFunc("GET /connections", h.GetConnections)
	protected.HandleFunc("POST /connections/request", h.SendConnectionRequest)
	protected.HandleFunc("GET /connections/requests", h.GetConnectionRequests)
	protected.HandleFunc("POST /connections/requests/{id}/accept", h.AcceptConnectionRequest)
	protected.HandleFunc("POST /connections/requests/{id}/dismiss", h.DismissConnectionRequest)
	protected.HandleFunc("DELETE /connections/{id}", h.Disconnect)

	// Chats & Messages
	protected.HandleFunc("GET /chats", h.GetChats)
	protected.HandleFunc("GET /chats/{id}/messages", h.GetMessages)
	protected.HandleFunc("POST /chats/{id}/messages", h.SendMessage)
	protected.HandleFunc("POST /chats/{id}/read", h.MarkChatRead)

	// Mount protected routes with AuthMiddleware
	mux.Handle("/", middleware.AuthMiddleware(jwtSecret)(protected))

	// WebSocket handler
	mux.HandleFunc("/ws", h.HandleWebSocket)

	// Apply global middleware (CORS, Logging)
	handler := middleware.CORSMiddleware()(mux)
	handler = middleware.LoggingMiddleware(handler)

	// Print startup banner
	printBanner(port)

	// --- Start server ---
	server := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: handler,
	}

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("❌ Server failed to start: %v", err)
	}
}

func printBanner(port string) {
	log.Println("🐾 ─────────────────────────────────────────")
	log.Printf("🐾  Pawly API Server — port %s\n", port)
	log.Println("🐾 ─────────────────────────────────────────")
	log.Printf("   Health:  http://localhost:%s/health\n", port)
	log.Printf("   Test:    http://localhost:%s/test\n", port)
	log.Printf("   Debug:   http://localhost:%s/debug\n", port)
	log.Println("   ─────────────────────────────────────────")
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
