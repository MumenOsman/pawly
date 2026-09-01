package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/lib/pq"
)

// --- /me endpoints (authenticated user) ---

// GetMe returns the authenticated user's basic info.
// GET /me
func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "unauthorized - please log in")
		return
	}

	user, err := h.fetchUser(userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

// GetMyProfile returns the authenticated user's profile (about me info).
// GET /me/profile
func (h *Handler) GetMyProfile(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "unauthorized - please log in")
		return
	}

	profile, err := h.fetchUserProfile(userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "profile not found")
		return
	}
	writeJSON(w, http.StatusOK, profile)
}

type updateProfileReq struct {
	OwnerName   string   `json:"owner_name"`
	Username    string   `json:"username"`
	DateOfBirth string   `json:"date_of_birth"`
	Location    string   `json:"location"`
	Latitude    float64  `json:"latitude"`
	Longitude   float64  `json:"longitude"`
	Bio         string   `json:"bio"`
	Interests   []string `json:"interests"`
	OwnerPhoto  string   `json:"owner_photo"`
}

// UpdateProfile updates the authenticated user's profile and pet coordinates.
// PUT /me/profile
func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "unauthorized - please log in")
		return
	}

	var req updateProfileReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Check unique username
	if req.Username != "" {
		var existingID int
		err := h.DB.QueryRow(`SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id <> $2`, req.Username, userID).Scan(&existingID)
		if err == nil && existingID > 0 {
			writeError(w, http.StatusBadRequest, "Username is already taken. Please choose another one.")
			return
		}
	}

	// Update user_profiles
	_, err := h.DB.Exec(`
		INSERT INTO user_profiles (user_id, owner_name, location, about_me, interests, owner_photo, date_of_birth, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		ON CONFLICT (user_id) DO UPDATE 
		SET owner_name = EXCLUDED.owner_name,
		    location = EXCLUDED.location,
		    about_me = EXCLUDED.about_me,
		    interests = EXCLUDED.interests,
		    owner_photo = CASE WHEN EXCLUDED.owner_photo <> '' THEN EXCLUDED.owner_photo ELSE user_profiles.owner_photo END,
		    date_of_birth = EXCLUDED.date_of_birth,
		    updated_at = NOW()
	`, userID, req.OwnerName, req.Location, req.Bio, pq.Array(req.Interests), req.OwnerPhoto, req.DateOfBirth)
	if err != nil {
		log.Printf("❌ Failed updating user_profiles for user %d: %v", userID, err)
		writeError(w, http.StatusInternalServerError, "failed to update profile")
		return
	}

	// Update users table owner_name, username & date_of_birth
	if req.OwnerName != "" {
		_, _ = h.DB.Exec(`UPDATE users SET owner_name = $1 WHERE id = $2`, req.OwnerName, userID)
	}
	if req.Username != "" {
		_, _ = h.DB.Exec(`UPDATE users SET username = $1 WHERE id = $2`, req.Username, userID)
	}
	if req.DateOfBirth != "" {
		_, _ = h.DB.Exec(`UPDATE users SET date_of_birth = $1 WHERE id = $2`, req.DateOfBirth, userID)
	}

	// If coordinates were provided, update pets' coordinates too
	if req.Latitude != 0 && req.Longitude != 0 {
		_, _ = h.DB.Exec(`
			UPDATE pets 
			SET latitude = $1, longitude = $2 
			WHERE owner_id = $3
		`, req.Latitude, req.Longitude, userID)
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "message": "profile updated"})
}

// GetMyPets returns all pets owned by the authenticated user.
// GET /me/pets
func (h *Handler) GetMyPets(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "unauthorized - please log in")
		return
	}

	rows, err := h.DB.Query(`
		SELECT p.id, p.owner_id, p.pet_name, p.animal_type, COALESCE(p.breed, ''), p.size, 
		       COALESCE(p.about_me, ''), COALESCE(p.pet_photo, ''), p.energy_level, 
		       COALESCE(p.pet_age, 0), COALESCE(p.temperament, '{}'), p.latitude, p.longitude, 
		       COALESCE(p.photos, '{}'),
		       COALESCE(pp.preferred_sizes, '{}'), COALESCE(pp.preferred_animal_types, '{}'),
		       COALESCE(pp.preferred_energy_levels, '{}'), COALESCE(pp.max_distance_km, 15.0)
		FROM pets p
		LEFT JOIN pet_preferences pp ON p.id = pp.pet_id
		WHERE p.owner_id = $1
		ORDER BY p.id ASC
	`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	type petResp struct {
		ID                    int      `json:"id"`
		OwnerID               int      `json:"owner_id"`
		PetName               string   `json:"pet_name"`
		AnimalType            string   `json:"animal_type"`
		Breed                 string   `json:"breed"`
		Size                  string   `json:"size"`
		AboutMe               string   `json:"about_me"`
		PetPhoto              string   `json:"pet_photo"`
		EnergyLevel           string   `json:"energy_level"`
		PetAge                int      `json:"pet_age"`
		Temperament           []string `json:"temperament"`
		Latitude              float64  `json:"latitude"`
		Longitude             float64  `json:"longitude"`
		Photos                []string `json:"photos"`
		PreferredSizes        []string `json:"preferred_sizes"`
		PreferredAnimalTypes  []string `json:"preferred_animal_types"`
		PreferredEnergyLevels []string `json:"preferred_energy_levels"`
		MaxDistanceKM         float64  `json:"max_distance_km"`
	}

	pets := make([]petResp, 0)
	for rows.Next() {
		var p petResp
		var temp, photos, prefSizes, prefTypes, prefEnergies []string
		var maxDist float64
		if err := rows.Scan(
			&p.ID, &p.OwnerID, &p.PetName, &p.AnimalType, &p.Breed, &p.Size,
			&p.AboutMe, &p.PetPhoto, &p.EnergyLevel, &p.PetAge, (*pq.StringArray)(&temp), &p.Latitude, &p.Longitude, (*pq.StringArray)(&photos),
			(*pq.StringArray)(&prefSizes), (*pq.StringArray)(&prefTypes), (*pq.StringArray)(&prefEnergies), &maxDist,
		); err == nil {
			p.Temperament = temp
			p.Photos = photos
			p.PreferredSizes = prefSizes
			p.PreferredAnimalTypes = prefTypes
			p.PreferredEnergyLevels = prefEnergies
			p.MaxDistanceKM = maxDist
			if len(p.Photos) == 0 && p.PetPhoto != "" {
				p.Photos = []string{p.PetPhoto}
			}
			pets = append(pets, p)
		}
	}

	writeJSON(w, http.StatusOK, pets)
}

// CreatePet creates a new pet for the authenticated user.
// POST /pets
func (h *Handler) CreatePet(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "unauthorized - please log in")
		return
	}

	var req struct {
		PetName     string   `json:"pet_name"`
		AnimalType  string   `json:"animal_type"`
		Breed       string   `json:"breed"`
		Size        string   `json:"size"`
		AboutMe     string   `json:"about_me"`
		EnergyLevel string   `json:"energy_level"`
		PetAge      int      `json:"pet_age"`
		Temperament []string `json:"temperament"`
		Latitude    float64  `json:"latitude"`
		Longitude   float64  `json:"longitude"`
	}

	if err := decodeJSON(r, &req); err != nil {
		req.PetName = "Buddy"
		req.AnimalType = "dog"
		req.Size = "medium"
		req.EnergyLevel = "medium"
	}

	if req.PetName == "" {
		req.PetName = "New Buddy"
	}
	if req.AboutMe == "" {
		req.AboutMe = "Write something about me..."
	}
	if req.Temperament == nil {
		req.Temperament = []string{}
	}

	lat := req.Latitude
	lng := req.Longitude
	if lat == 0 && lng == 0 {
		lat = 60.1699
		lng = 24.9384
	}

	// Synchronize PostgreSQL sequence to avoid primary key collision
	_, _ = h.DB.Exec(`SELECT setval('pets_id_seq', COALESCE((SELECT MAX(id) FROM pets), 1));`)

	petPhoto := "/paw-icon.svg"
	photos := []string{"/paw-icon.svg"}

	var newID int
	err := h.DB.QueryRow(`
		INSERT INTO pets (owner_id, pet_name, animal_type, breed, size, about_me, pet_photo, photos, energy_level, pet_age, temperament, latitude, longitude)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id;
	`, userID, req.PetName, req.AnimalType, req.Breed, req.Size, req.AboutMe, petPhoto, pq.Array(photos), req.EnergyLevel, req.PetAge, pq.Array(req.Temperament), lat, lng).Scan(&newID)

	if err != nil {
		log.Printf("❌ Failed creating pet: %v", err)
		writeError(w, http.StatusInternalServerError, "Failed to create pet")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"id": newID, "pet_photo": petPhoto, "photos": photos, "latitude": lat, "longitude": lng, "message": "Pet created successfully"})
}

// UpdatePet updates an existing pet's details and photos.
// PUT /pets/{id}
func (h *Handler) UpdatePet(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "unauthorized - please log in")
		return
	}

	petIDStr := r.PathValue("id")
	petID, err := strconv.Atoi(petIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid pet ID")
		return
	}

	var req struct {
		PetName     string          `json:"pet_name"`
		AnimalType  string          `json:"animal_type"`
		Breed       string          `json:"breed"`
		Size        string          `json:"size"`
		AboutMe     string          `json:"about_me"`
		PetPhoto    string          `json:"pet_photo"`
		EnergyLevel string          `json:"energy_level"`
		PetAge      json.RawMessage `json:"pet_age"`
		Temperament           []string        `json:"temperament"`
		Photos                []string        `json:"photos"`
		PreferredSizes        []string        `json:"preferred_sizes"`
		PreferredAnimalTypes  []string        `json:"preferred_animal_types"`
		PreferredEnergyLevels []string        `json:"preferred_energy_levels"`
		MaxDistanceKM         float64         `json:"max_distance_km"`
		Latitude              json.RawMessage `json:"latitude"`
		Longitude             json.RawMessage `json:"longitude"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var age int
	if len(req.PetAge) > 0 {
		var ageInt int
		if err := json.Unmarshal(req.PetAge, &ageInt); err == nil {
			age = ageInt
		} else {
			var ageStr string
			if err := json.Unmarshal(req.PetAge, &ageStr); err == nil {
				if parsed, err := strconv.Atoi(ageStr); err == nil {
					age = parsed
				}
			}
		}
	}

	var lat, lng float64
	if len(req.Latitude) > 0 {
		var f float64
		if err := json.Unmarshal(req.Latitude, &f); err == nil {
			lat = f
		}
	}
	if len(req.Longitude) > 0 {
		var f float64
		if err := json.Unmarshal(req.Longitude, &f); err == nil {
			lng = f
		}
	}

	res, err := h.DB.Exec(`
		UPDATE pets 
		SET pet_name = CASE WHEN $1 <> '' THEN $1 ELSE pet_name END,
		    animal_type = CASE WHEN $2 <> '' THEN $2 ELSE animal_type END,
		    breed = CASE WHEN $3 <> '' THEN $3 ELSE breed END,
		    size = CASE WHEN $4 <> '' THEN $4 ELSE size END,
		    about_me = $5,
		    pet_photo = CASE WHEN $6 <> '' THEN $6 ELSE pet_photo END,
		    energy_level = CASE WHEN $7 <> '' THEN $7 ELSE energy_level END,
		    pet_age = $8,
		    temperament = CASE WHEN array_length($9::text[], 1) > 0 THEN $9::text[] ELSE temperament END,
		    photos = CASE WHEN array_length($10::text[], 1) > 0 THEN $10::text[] ELSE photos END,
		    latitude = CASE WHEN $11 <> 0.0 THEN $11 ELSE latitude END,
		    longitude = CASE WHEN $12 <> 0.0 THEN $12 ELSE longitude END
		WHERE id = $13 AND owner_id = $14;
	`, req.PetName, req.AnimalType, req.Breed, req.Size, req.AboutMe, req.PetPhoto, req.EnergyLevel, age, pq.Array(req.Temperament), pq.Array(req.Photos), lat, lng, petID, userID)

	if err != nil {
		log.Printf("❌ Failed updating pet %d: %v", petID, err)
		writeError(w, http.StatusInternalServerError, "Failed to update pet")
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		writeError(w, http.StatusNotFound, "Pet not found or unauthorized")
		return
	}

	// Update pet_preferences
	maxDist := req.MaxDistanceKM
	if maxDist <= 0 {
		maxDist = 15.0
	}
	_, _ = h.DB.Exec(`
		INSERT INTO pet_preferences (pet_id, preferred_sizes, preferred_animal_types, preferred_energy_levels, max_distance_km)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (pet_id) DO UPDATE
		SET preferred_sizes = EXCLUDED.preferred_sizes,
		    preferred_animal_types = EXCLUDED.preferred_animal_types,
		    preferred_energy_levels = EXCLUDED.preferred_energy_levels,
		    max_distance_km = EXCLUDED.max_distance_km;
	`, petID, pq.Array(req.PreferredSizes), pq.Array(req.PreferredAnimalTypes), pq.Array(req.PreferredEnergyLevels), maxDist)

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "message": "pet updated"})
}

// DeletePet removes a pet owned by the authenticated user.
// DELETE /pets/{id}
func (h *Handler) DeletePet(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "unauthorized - please log in")
		return
	}

	petIDStr := r.PathValue("id")
	petID, err := strconv.Atoi(petIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid pet ID")
		return
	}

	res, err := h.DB.Exec(`DELETE FROM pets WHERE id = $1 AND owner_id = $2;`, petID, userID)
	if err != nil {
		log.Printf("❌ Failed deleting pet %d: %v", petID, err)
		writeError(w, http.StatusInternalServerError, "Failed to delete pet")
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		writeError(w, http.StatusNotFound, "Pet not found or unauthorized")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "message": "pet deleted"})
}

// GetPet returns a specific pet's full details by ID.
// GET /pets/{id}
func (h *Handler) GetPet(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	petIDStr := r.PathValue("id")
	petID, err := strconv.Atoi(petIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid pet ID")
		return
	}

	type petDetailResp struct {
		ID          int      `json:"id"`
		OwnerID     int      `json:"owner_id"`
		PetName     string   `json:"pet_name"`
		AnimalType  string   `json:"animal_type"`
		Breed       string   `json:"breed"`
		Size        string   `json:"size"`
		AboutMe     string   `json:"about_me"`
		PetPhoto    string   `json:"pet_photo"`
		EnergyLevel string   `json:"energy_level"`
		PetAge      int      `json:"pet_age"`
		Temperament []string `json:"temperament"`
		Latitude    float64  `json:"latitude"`
		Longitude   float64  `json:"longitude"`
		Photos      []string `json:"photos"`
	}

	var p petDetailResp
	var temp, photos pq.StringArray
	err = h.DB.QueryRow(`
		SELECT id, owner_id, pet_name, animal_type, COALESCE(breed, ''), size, 
		       COALESCE(about_me, ''), COALESCE(pet_photo, ''), energy_level, 
		       COALESCE(pet_age, 0), COALESCE(temperament, '{}'), latitude, longitude,
		       COALESCE(photos, '{}')
		FROM pets 
		WHERE id = $1
	`, petID).Scan(
		&p.ID, &p.OwnerID, &p.PetName, &p.AnimalType, &p.Breed, &p.Size,
		&p.AboutMe, &p.PetPhoto, &p.EnergyLevel, &p.PetAge, &temp, &p.Latitude, &p.Longitude, &photos,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "Pet not found")
		return
	}

	p.Temperament = []string(temp)
	p.Photos = []string(photos)
	if len(p.Photos) == 0 && p.PetPhoto != "" {
		p.Photos = []string{p.PetPhoto}
	}

	writeJSON(w, http.StatusOK, p)
}

// GetMyBio returns the authenticated user's biographical data (pets + preferences).
// GET /me/bio
func (h *Handler) GetMyBio(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "unauthorized - please log in")
		return
	}

	bio, err := h.fetchUserBio(userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "bio data not found")
		return
	}
	writeJSON(w, http.StatusOK, bio)
}

// canViewUser checks whether requestingUserID is allowed to view targetUserID's profile.
// Access is permitted if:
// 1. requestingUserID == targetUserID
// 2. targetUser is recommended to requester
// 3. There is a pending connection request between their pets
// 4. There is an established connection between their pets
func (h *Handler) canViewUser(requestingUserID, targetUserID int) bool {
	if requestingUserID == targetUserID {
		return true
	}

	var allowed bool
	err := h.DB.QueryRow(`
		SELECT EXISTS (
			-- 1. Connected
			SELECT 1 FROM connections c
			JOIN pets p1 ON c.pet1_id = p1.id
			JOIN pets p2 ON c.pet2_id = p2.id
			WHERE (p1.owner_id = $1 AND p2.owner_id = $2)
			   OR (p1.owner_id = $2 AND p2.owner_id = $1)
			
			UNION
			
			-- 2. Open connection request
			SELECT 1 FROM connection_requests cr
			JOIN pets p_sender ON cr.sender_pet_id = p_sender.id
			JOIN pets p_receiver ON cr.receiver_pet_id = p_receiver.id
			WHERE (p_sender.owner_id = $1 AND p_receiver.owner_id = $2)
			   OR (p_sender.owner_id = $2 AND p_receiver.owner_id = $1)

			UNION

			-- 3. Recommended (shares at least one compatible animal type and within 40km or not dismissed)
			SELECT 1 FROM pets p_target
			JOIN pets p_my ON p_target.animal_type = p_my.animal_type
			WHERE p_target.owner_id = $2 AND p_my.owner_id = $1
			  AND p_target.id NOT IN (SELECT pet_id FROM dismissed_recommendations WHERE user_id = $1)
		)
	`, requestingUserID, targetUserID).Scan(&allowed)

	return err == nil && allowed
}

// GetUser returns a user's basic info (name + photo + profile_url).
// GET /users/{id}
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	requestingUserID := getUserID(r)
	targetID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	if !h.canViewUser(requestingUserID, targetID) {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	user, err := h.fetchUser(targetID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

// GetUserProfile returns a user's "about me" information.
// GET /users/{id}/profile
func (h *Handler) GetUserProfile(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	requestingUserID := getUserID(r)
	targetID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, "profile not found")
		return
	}

	if !h.canViewUser(requestingUserID, targetID) {
		writeError(w, http.StatusNotFound, "profile not found")
		return
	}

	profile, err := h.fetchUserProfile(targetID)
	if err != nil {
		writeError(w, http.StatusNotFound, "profile not found")
		return
	}

	// Strip private data (email, date_of_birth) when viewed by other users
	if requestingUserID != targetID {
		sanitized := *profile
		sanitized.Email = ""
		sanitized.DateOfBirth = ""
		writeJSON(w, http.StatusOK, sanitized)
		return
	}

	writeJSON(w, http.StatusOK, profile)
}

// GetUserBio returns a user's biographical data (the data used for recommendations).
// GET /users/{id}/bio
func (h *Handler) GetUserBio(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	requestingUserID := getUserID(r)
	targetID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, "bio data not found")
		return
	}

	if !h.canViewUser(requestingUserID, targetID) {
		writeError(w, http.StatusNotFound, "bio data not found")
		return
	}

	bio, err := h.fetchUserBio(targetID)
	if err != nil {
		writeError(w, http.StatusNotFound, "bio data not found")
		return
	}
	writeJSON(w, http.StatusOK, bio)
}

// --- Database query helpers ---

type userBasic struct {
	ID          int    `json:"id"`
	OwnerName   string `json:"owner_name"`
	OwnerPhoto  string `json:"owner_photo"`
	ProfileURL  string `json:"profile_url"`
	ProfileLink string `json:"profile_link"`
}

type userProfile struct {
	ID          int      `json:"id"`
	OwnerName   string   `json:"owner_name"`
	Username    string   `json:"username"`
	Email       string   `json:"email"`
	DateOfBirth string   `json:"date_of_birth"`
	OwnerPhoto  string   `json:"owner_photo"`
	AboutMe     string   `json:"about_me"`
	Location    string   `json:"location"`
	Interests   []string `json:"interests"`
}

type petBio struct {
	ID          int      `json:"id"`
	PetName     string   `json:"pet_name"`
	AnimalType  string   `json:"animal_type"`
	Breed       string   `json:"breed"`
	Size        string   `json:"size"`
	EnergyLevel string   `json:"energy_level"`
	PetAge      int      `json:"pet_age"`
	Temperament []string `json:"temperament"`
}

type userBio struct {
	ID   int      `json:"id"`
	Pets []petBio `json:"pets"`
}

func (h *Handler) fetchUser(userID int) (*userBasic, error) {
	var u userBasic
	var photo sql.NullString
	err := h.DB.QueryRow(
		`SELECT u.id, u.owner_name, COALESCE(p.owner_photo, '') 
		 FROM users u 
		 LEFT JOIN user_profiles p ON p.user_id = u.id 
		 WHERE u.id = $1`, userID,
	).Scan(&u.ID, &u.OwnerName, &photo)
	if err != nil {
		return nil, err
	}
	u.OwnerPhoto = photo.String
	u.ProfileURL = "/users/" + strconv.Itoa(userID) + "/profile"
	u.ProfileLink = "/users/" + strconv.Itoa(userID) + "/profile"
	return &u, nil
}

func (h *Handler) fetchUserProfile(userID int) (*userProfile, error) {
	var p userProfile
	var interests []string
	var username, email, dob sql.NullString
	err := h.DB.QueryRow(
		`SELECT p.user_id, COALESCE(u.owner_name, p.owner_name, ''), COALESCE(p.owner_photo, ''), 
		        COALESCE(p.about_me, ''), COALESCE(p.location, ''), 
		        COALESCE(p.interests, '{}'),
		        COALESCE(u.username, ''), COALESCE(u.email, ''),
		        COALESCE(u.date_of_birth, p.date_of_birth, '')
		 FROM user_profiles p 
		 JOIN users u ON u.id = p.user_id
		 WHERE p.user_id = $1`, userID,
	).Scan(&p.ID, &p.OwnerName, &p.OwnerPhoto, &p.AboutMe, &p.Location, pq.Array(&interests), &username, &email, &dob)
	if err != nil {
		return nil, err
	}
	p.Username = username.String
	p.Email = email.String
	p.DateOfBirth = dob.String
	p.Interests = interests
	if p.Interests == nil {
		p.Interests = []string{}
	}
	return &p, nil
}

func (h *Handler) fetchUserBio(userID int) (*userBio, error) {
	bio := &userBio{ID: userID, Pets: []petBio{}}

	rows, err := h.DB.Query(
		`SELECT id, pet_name, animal_type, COALESCE(breed, ''), size, 
		        energy_level, COALESCE(pet_age, 0), COALESCE(temperament, '{}')
		 FROM pets WHERE owner_id = $1`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var p petBio
		var temperament []string
		if err := rows.Scan(&p.ID, &p.PetName, &p.AnimalType, &p.Breed,
			&p.Size, &p.EnergyLevel, &p.PetAge, pq.Array(&temperament)); err != nil {
			return nil, err
		}
		p.Temperament = temperament
		if p.Temperament == nil {
			p.Temperament = []string{}
		}
		bio.Pets = append(bio.Pets, p)
	}
	return bio, nil
}

// DeleteAccount cascades deletions across all user relations in PostgreSQL
// DeleteAccount deletes the authenticated user and all related data (cascaded by foreign keys).
// DELETE /me
func (h *Handler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	res, err := h.DB.Exec(`DELETE FROM users WHERE id = $1;`, userID)
	if err != nil {
		log.Printf("Failed deleting user %d: %v", userID, err)
		writeError(w, http.StatusInternalServerError, "Failed to delete account")
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		writeError(w, http.StatusNotFound, "User not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Account deleted successfully",
	})
}

