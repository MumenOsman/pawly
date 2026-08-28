package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"golang.org/x/crypto/bcrypt"

	"match-me/internal/database"
	"match-me/internal/handlers"
	"match-me/internal/middleware"
	"match-me/internal/ws"
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

		// Generate password hash for default test accounts (password123)
		passBytes, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
		passHash := string(passBytes)

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
			DELETE FROM users WHERE username = '' AND id > 100 AND id NOT IN (106, 110, 111);

			-- 0. Ensure base User accounts exist for Maria (106), Aino (110), Mikko (111)
			INSERT INTO users (id, email, password_hash, owner_name, username, date_of_birth)
			VALUES 
			(106, 'maria_k2026@pawly.fi', '`+passHash+`', 'Maria Koskinen', 'maria_k2026', '1995-06-15'),
			(110, 'aino@pawly.fi', '`+passHash+`', 'Aino Virtanen', 'aino_v', '1998-04-12'),
			(111, 'mikko@pawly.fi', '`+passHash+`', 'Mikko Korhonen', 'mikko_k', '1991-09-20')
			ON CONFLICT (id) DO UPDATE SET 
				email = EXCLUDED.email, 
				password_hash = EXCLUDED.password_hash, 
				owner_name = EXCLUDED.owner_name, 
				username = EXCLUDED.username, 
				date_of_birth = EXCLUDED.date_of_birth;

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

			INSERT INTO pets (id, owner_id, pet_name, animal_type, breed, size, about_me, pet_photo, energy_level, pet_age, temperament, latitude, longitude)
			VALUES
			(1060, 106, 'Bella', 'dog', 'Golden Retriever', 'large', 'Super enthusiastic and friendly Golden who loves fetch, swimming, and running with playmates!', 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&auto=format&fit=crop&q=80', 'high', 3, ARRAY['Friendly', 'Playful', 'Energetic', 'Social'], 60.1797, 24.9224),
			(1100, 110, 'Milo', 'dog', 'French Bulldog', 'small', 'Calm and affectionate city pup who loves gentle socialization and basking in sunny park spots.', 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop&q=80', 'medium', 2, ARRAY['Calm', 'Affectionate', 'Social', 'Gentle'], 60.1872, 24.9538),
			(1110, 111, 'Luna', 'dog', 'Border Collie', 'medium', 'Quick-witted and athletic girl who excels at agility courses and loves playing chase with active dogs.', 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=600&auto=format&fit=crop&q=80', 'high', 4, ARRAY['Playful', 'Intelligent', 'Energetic', 'Agile'], 60.1772, 24.8055)
			ON CONFLICT (id) DO UPDATE SET
				pet_name = EXCLUDED.pet_name,
				animal_type = EXCLUDED.animal_type,
				breed = EXCLUDED.breed,
				size = EXCLUDED.size,
				about_me = EXCLUDED.about_me,
				pet_photo = EXCLUDED.pet_photo,
				energy_level = EXCLUDED.energy_level,
				pet_age = EXCLUDED.pet_age,
				temperament = EXCLUDED.temperament;

			-- Sync pets_id_seq
			SELECT setval('pets_id_seq', GREATEST((SELECT MAX(id) FROM pets), 1200));

			-- 3. Ensure Connections between Maria, Aino, and Mikko
			INSERT INTO connections (id, pet1_id, pet2_id, created_at)
			VALUES
			(1001, 1060, 1100, NOW() - INTERVAL '3 days'),
			(1002, 1060, 1110, NOW() - INTERVAL '2 days'),
			(1003, 1100, 1110, NOW() - INTERVAL '1 day')
			ON CONFLICT (id) DO NOTHING;

			-- Sync connections_id_seq
			SELECT setval('connections_id_seq', GREATEST((SELECT MAX(id) FROM connections), 1100));

			-- 4. Ensure Chats for each Connection
			INSERT INTO chats (id, connection_id, created_at)
			VALUES
			(1001, 1001, NOW() - INTERVAL '3 days'),
			(1002, 1002, NOW() - INTERVAL '2 days'),
			(1003, 1003, NOW() - INTERVAL '1 day')
			ON CONFLICT (id) DO NOTHING;

			-- Sync chats_id_seq
			SELECT setval('chats_id_seq', GREATEST((SELECT MAX(id) FROM chats), 1100));

			-- 5. Seed Messages between the users
			DELETE FROM messages WHERE chat_id IN (1001, 1002, 1003);

			-- Chat 1001: Maria (106) & Aino (110)
			INSERT INTO messages (chat_id, sender_user_id, body, created_at, read_at)
			VALUES
			(1001, 106, 'Hey Aino! Saw Milo on Discover. Such a handsome Frenchie! Does he like walks in Töölö park?', NOW() - INTERVAL '2 days' + INTERVAL '10 minutes', NOW() - INTERVAL '2 days' + INTERVAL '12 minutes'),
			(1001, 110, 'Hi Maria! Thanks! Yes, Milo loves quiet park strolls, especially in the afternoon. Bella looks so full of energy!', NOW() - INTERVAL '2 days' + INTERVAL '15 minutes', NOW() - INTERVAL '2 days' + INTERVAL '18 minutes'),
			(1001, 106, 'She definitely is! We usually go around 4 PM. Want to do a short meetup this Saturday?', NOW() - INTERVAL '1 day' + INTERVAL '2 hours', NOW() - INTERVAL '1 day' + INTERVAL '2 hours 5 minutes'),
			(1001, 110, 'Sounds perfect! Let us meet near the entrance by the fountain at 4:00 PM.', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours 30 minutes'),
			(1001, 106, 'Awesome, see you and Milo then! 🐕', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours');

			-- Chat 1002: Maria (106) & Mikko (111)
			INSERT INTO messages (chat_id, sender_user_id, body, created_at, read_at)
			VALUES
			(1002, 111, 'Moi Maria! Luna and I often visit the agility park in Rajasaari. Would Bella want to join for a run sometime?', NOW() - INTERVAL '1 day' + INTERVAL '1 hour', NOW() - INTERVAL '1 day' + INTERVAL '1 hour 10 minutes'),
			(1002, 106, 'Moi Mikko! Absolutely, Bella would love that! She has so much stamina to burn.', NOW() - INTERVAL '1 day' + INTERVAL '1 hour 30 minutes', NOW() - INTERVAL '1 day' + INTERVAL '1 hour 45 minutes'),
			(1002, 111, 'Great! How about Sunday morning around 10 AM before it gets too crowded?', NOW() - INTERVAL '18 hours', NOW() - INTERVAL '17 hours'),
			(1002, 106, 'Sunday at 10 AM works great for us. See you and Luna there! 🐾', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours');

			-- Chat 1003: Aino (110) & Mikko (111)
			INSERT INTO messages (chat_id, sender_user_id, body, created_at, read_at)
			VALUES
			(1003, 110, 'Hey Mikko! How is Luna doing? Milo was wondering if you guys are going on the Tapiola coastal walk this week.', NOW() - INTERVAL '20 hours', NOW() - INTERVAL '19 hours'),
			(1003, 111, 'Hey Aino! Luna is great, we are actually heading out tomorrow around 5 PM if you want to tag along!', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '10 hours'),
			(1003, 110, 'Count us in! See you tomorrow at 5 PM.', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour');

			-- Sync messages_id_seq
			SELECT setval('messages_id_seq', GREATEST((SELECT MAX(id) FROM messages), 1000));
		`)
	}

	// --- WebSocket Hub ---
	hub := ws.NewHub()
	go hub.Run()

	// --- Create handlers ---
	h := handlers.New(db, jwtSecret, hub)
	auth := middleware.NewAuth(jwtSecret)

	// --- Setup routes ---
	mux := http.NewServeMux()

	// WebSocket endpoint
	mux.HandleFunc("GET /ws", h.HandleWebSocket)

	// Health check (public)
	mux.HandleFunc("GET /health", h.Health)

	// Auth (public)
	mux.HandleFunc("POST /auth/register", h.Register)
	mux.HandleFunc("POST /auth/login", h.Login)

	// Me — authenticated user shortcuts
	mux.HandleFunc("GET /me", auth.Optional(h.GetMe))
	mux.HandleFunc("GET /me/profile", auth.Optional(h.GetMyProfile))
	mux.HandleFunc("PUT /me/profile", auth.Optional(h.UpdateProfile))
	mux.HandleFunc("GET /me/bio", auth.Optional(h.GetMyBio))
	mux.HandleFunc("GET /me/pets", auth.Optional(h.GetMyPets))
	mux.HandleFunc("POST /pets", auth.Optional(h.CreatePet))
	mux.HandleFunc("PUT /pets/{id}", auth.Optional(h.UpdatePet))
	mux.HandleFunc("DELETE /pets/{id}", auth.Optional(h.DeletePet))
	mux.HandleFunc("POST /me/photo", auth.Optional(h.UploadUserPhoto))
	mux.HandleFunc("POST /pets/{id}/photo", auth.Optional(h.UploadPetPhoto))
	mux.HandleFunc("DELETE /me", auth.Optional(h.DeleteAccount))
	mux.HandleFunc("DELETE /users/me", auth.Optional(h.DeleteAccount))

	// Static file serving for uploads
	mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))

	// Users (protected)
	mux.HandleFunc("GET /users/{id}", auth.Required(h.GetUser))
	mux.HandleFunc("GET /users/{id}/profile", auth.Required(h.GetUserProfile))
	mux.HandleFunc("GET /users/{id}/bio", auth.Required(h.GetUserBio))

	// Recommendations (protected/optional for demo)
	mux.HandleFunc("GET /recommendations", auth.Optional(h.GetRecommendations))
	mux.HandleFunc("POST /recommendations/{id}/dismiss", auth.Optional(h.DismissRecommendation))

	// Connections
	mux.HandleFunc("GET /connections", auth.Optional(h.GetConnections))
	mux.HandleFunc("POST /connections/request", auth.Optional(h.SendConnectionRequest))
	mux.HandleFunc("GET /connections/requests", auth.Optional(h.GetConnectionRequests))
	mux.HandleFunc("POST /connections/requests/{id}/accept", auth.Optional(h.AcceptConnectionRequest))
	mux.HandleFunc("POST /connections/requests/{id}/dismiss", auth.Optional(h.DismissConnectionRequest))
	mux.HandleFunc("DELETE /connections/{id}", auth.Optional(h.Disconnect))

	// Chats
	mux.HandleFunc("GET /chats", auth.Optional(h.GetChats))
	mux.HandleFunc("GET /chats/{id}/messages", auth.Optional(h.GetMessages))
	mux.HandleFunc("POST /chats/{id}/messages", auth.Optional(h.SendMessage))

	// Debug & test consoles (public — development only)
	mux.HandleFunc("GET /test", h.TestPage)
	mux.HandleFunc("GET /debug", h.DebugPage)
	mux.HandleFunc("GET /debug/tables", h.DebugTables)
	mux.HandleFunc("GET /debug/tables/{name}", h.DebugTableData)
	mux.HandleFunc("POST /debug/query", h.DebugSQLExec)

	// Apply CORS middleware
	handler := middleware.CORS(mux)

	// --- Start server ---
	fmt.Println("🐾 ─────────────────────────────────────────")
	fmt.Printf("🐾  Pawly API Server — port %s\n", port)
	fmt.Println("🐾 ─────────────────────────────────────────")
	fmt.Printf("   Health:  http://localhost:%s/health\n", port)
	fmt.Printf("   Test:    http://localhost:%s/test\n", port)
	fmt.Printf("   Debug:   http://localhost:%s/debug\n", port)
	fmt.Println("   ─────────────────────────────────────────")

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
