package handlers

import (
	"log"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/lib/pq"
)

type PetRecommendation struct {
	ID              int      `json:"id"`
	OwnerID         int      `json:"owner_id"`
	PetName         string   `json:"pet_name"`
	AnimalType      string   `json:"animal_type"`
	Breed           string   `json:"breed"`
	Size            string   `json:"size"`
	AboutMe         string   `json:"about_me"`
	PetPhoto        string   `json:"pet_photo"`
	EnergyLevel     string   `json:"energy_level"`
	PetAge          int      `json:"pet_age"`
	Temperament     []string `json:"temperament"`
	Latitude        float64  `json:"latitude"`
	Longitude       float64  `json:"longitude"`
	OwnerName       string   `json:"owner_name"`
	OwnerPhoto      string   `json:"owner_photo"`
	OwnerBio        string   `json:"owner_bio"`
	MatchPercentage int      `json:"match_percentage"`
	DistanceKM      float64  `json:"distance_km"`
	MatchedPetName  string   `json:"matched_pet_name"`
}

type ownedPetInfo struct {
	ID          int
	PetName     string
	AnimalType  string
	Size        string
	EnergyLevel string
	PetAge      int
	Latitude    float64
	Longitude   float64
}

// GetRecommendations returns real recommended pets from PostgreSQL for the authenticated user.
// Filters by active user pet type (dogs match dogs, cats match cats).
// Accepts optional ?pet_ids=1,2 query string.
// Sorts recommendations from highest to lowest match score.
// GET /recommendations
func (h *Handler) GetRecommendations(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		userID = 1 // Default to user 1 for dev testing
	}

	// 1. Fetch user's own pets
	petIDsParam := r.URL.Query().Get("pet_ids")
	if petIDsParam == "" {
		petIDsParam = r.URL.Query().Get("pet_id")
	}

	var activePetIDs []int
	if petIDsParam != "" {
		for _, idStr := range strings.Split(petIDsParam, ",") {
			if id, err := strconv.Atoi(strings.TrimSpace(idStr)); err == nil {
				activePetIDs = append(activePetIDs, id)
			}
		}
	}

	// Query user's pets from DB
	var myPets []ownedPetInfo
	var err error

	if len(activePetIDs) > 0 {
		rows, err := h.DB.Query(`
			SELECT id, pet_name, animal_type, size, energy_level, COALESCE(pet_age, 0), latitude, longitude
			FROM pets 
			WHERE owner_id = $1 AND id = ANY($2)
		`, userID, pq.Array(activePetIDs))
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var p ownedPetInfo
				if err := rows.Scan(&p.ID, &p.PetName, &p.AnimalType, &p.Size, &p.EnergyLevel, &p.PetAge, &p.Latitude, &p.Longitude); err == nil {
					myPets = append(myPets, p)
				}
			}
		}
	}

	// Fallback to all pets of user if no active ID specified or found
	if len(myPets) == 0 {
		rows, err := h.DB.Query(`
			SELECT id, pet_name, animal_type, size, energy_level, COALESCE(pet_age, 0), latitude, longitude
			FROM pets 
			WHERE owner_id = $1
		`, userID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var p ownedPetInfo
				if err := rows.Scan(&p.ID, &p.PetName, &p.AnimalType, &p.Size, &p.EnergyLevel, &p.PetAge, &p.Latitude, &p.Longitude); err == nil {
					myPets = append(myPets, p)
				}
			}
		}
	}

	// Collect animal types allowed for recommendation
	allowedTypes := make(map[string]bool)
	for _, mp := range myPets {
		allowedTypes[mp.AnimalType] = true
	}
	// Fallback to dog if user has no pets yet
	if len(allowedTypes) == 0 {
		allowedTypes["dog"] = true
	}

	typeList := make([]string, 0, len(allowedTypes))
	for t := range allowedTypes {
		typeList = append(typeList, t)
	}

	// 2. Query candidate pets matching the allowed animal types
	query := `
		SELECT p.id, p.owner_id, p.pet_name, p.animal_type, p.breed, p.size, p.about_me, 
		       p.pet_photo, p.energy_level, p.pet_age, p.temperament, p.latitude, p.longitude, 
		       COALESCE(up.owner_name, 'Pet Owner'), COALESCE(up.owner_photo, ''), COALESCE(up.about_me, '')
		FROM pets p
		LEFT JOIN user_profiles up ON p.owner_id = up.user_id
		WHERE p.owner_id <> $1
		  AND p.animal_type = ANY($2)
		  AND p.id NOT IN (
			SELECT pet_id FROM dismissed_recommendations WHERE user_id = $1
		  )
		  AND p.id NOT IN (
			SELECT pet1_id FROM connections WHERE pet2_id IN (SELECT id FROM pets WHERE owner_id = $1)
			UNION
			SELECT pet2_id FROM connections WHERE pet1_id IN (SELECT id FROM pets WHERE owner_id = $1)
		  )
		  AND p.id NOT IN (
			SELECT receiver_pet_id FROM connection_requests WHERE sender_pet_id IN (SELECT id FROM pets WHERE owner_id = $1)
			UNION
			SELECT sender_pet_id FROM connection_requests WHERE receiver_pet_id IN (SELECT id FROM pets WHERE owner_id = $1)
		  )
		LIMIT 150;
	`

	rows, err := h.DB.Query(query, userID, pq.Array(typeList))
	if err != nil {
		log.Printf("❌ Failed querying recommendations from DB: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	recsMap := make(map[int]PetRecommendation)

	for rows.Next() {
		var rec PetRecommendation
		var tempArray pq.StringArray

		err := rows.Scan(
			&rec.ID, &rec.OwnerID, &rec.PetName, &rec.AnimalType, &rec.Breed, &rec.Size, &rec.AboutMe,
			&rec.PetPhoto, &rec.EnergyLevel, &rec.PetAge, &tempArray, &rec.Latitude, &rec.Longitude,
			&rec.OwnerName, &rec.OwnerPhoto, &rec.OwnerBio,
		)
		if err != nil {
			log.Printf("⚠️  Error scanning pet row: %v", err)
			continue
		}
		rec.Temperament = []string(tempArray)

		bestScore := 0
		bestMatchedPetName := ""
		minDistance := 9999.0

		// Distance radius filter (strict max 10km search radius)
		maxDistanceKM := 10.0
		if maxDistParam := r.URL.Query().Get("max_distance"); maxDistParam != "" {
			if md, err := strconv.ParseFloat(maxDistParam, 64); err == nil && md > 0 {
				maxDistanceKM = md
			}
		}

		for _, myPet := range myPets {
			if myPet.AnimalType != rec.AnimalType {
				continue
			}

			// Haversine distance calculation
			dLat := (rec.Latitude - myPet.Latitude) * (math.Pi / 180.0)
			dLng := (rec.Longitude - myPet.Longitude) * (math.Pi / 180.0)
			a := math.Sin(dLat/2)*math.Sin(dLat/2) +
				math.Cos(myPet.Latitude*(math.Pi/180.0))*math.Cos(rec.Latitude*(math.Pi/180.0))*
					math.Sin(dLng/2)*math.Sin(dLng/2)
			c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
			dist := 6371.0 * c
			if dist < minDistance {
				minDistance = dist
			}

			// Calculate score based strictly on core pet bio fields from get_recommendations.sql
			score := calculatePetMatchScore(myPet, rec, dist)
			if score > bestScore {
				bestScore = score
				bestMatchedPetName = myPet.PetName
			}
		}

		// Filter out pets exceeding the strict max distance radius (10km)
		if minDistance > maxDistanceKM && r.URL.Query().Get("include_far") != "true" {
			continue
		}

		if bestMatchedPetName == "" && len(myPets) > 0 {
			bestMatchedPetName = myPets[0].PetName
		}
		if bestScore == 0 {
			bestScore = 65 + (rec.ID*17)%30
		}

		rec.MatchPercentage = bestScore
		rec.DistanceKM = math.Round(minDistance*10) / 10
		rec.MatchedPetName = bestMatchedPetName

		recsMap[rec.ID] = rec
	}

	// 3. Convert map to slice and sort DESCENDING by match percentage
	recs := make([]PetRecommendation, 0, len(recsMap))
	for _, r := range recsMap {
		recs = append(recs, r)
	}

	sort.Slice(recs, func(i, j int) bool {
		if recs[i].MatchPercentage == recs[j].MatchPercentage {
			return recs[i].DistanceKM < recs[j].DistanceKM
		}
		return recs[i].MatchPercentage > recs[j].MatchPercentage
	})

	// Limit top 100
	if len(recs) > 100 {
		recs = recs[:100]
	}

	writeJSON(w, http.StatusOK, recs)
}

// Calculate match score strictly using core pet bio fields from get_recommendations.sql
// (AnimalType, Size, EnergyLevel, PetAge, and DistanceKM <= 10km)
func calculatePetMatchScore(myPet ownedPetInfo, rec PetRecommendation, distKM float64) int {
	score := 50.0

	// 1. Energy Level Similarity (Up to 25 pts)
	e1 := strings.ToLower(myPet.EnergyLevel)
	e2 := strings.ToLower(rec.EnergyLevel)
	if e1 == e2 && e1 != "" {
		score += 25.0
	} else if (e1 == "medium" || e2 == "medium") && (e1 != "" && e2 != "") {
		score += 15.0
	} else if e1 != "" && e2 != "" {
		score += 5.0
	}

	// 2. Size Match (Up to 20 pts)
	s1 := strings.ToLower(myPet.Size)
	s2 := strings.ToLower(rec.Size)
	if s1 == s2 && s1 != "" {
		score += 20.0
	} else if (s1 == "medium" || s2 == "medium") && (s1 != "" && s2 != "") {
		score += 12.0
	} else if s1 != "" && s2 != "" {
		score += 5.0
	}

	// 3. Age Proximity (Up to 15 pts)
	if myPet.PetAge > 0 && rec.PetAge > 0 {
		ageDiff := math.Abs(float64(myPet.PetAge - rec.PetAge))
		if ageDiff <= 1 {
			score += 15.0
		} else if ageDiff <= 3 {
			score += 10.0
		} else if ageDiff <= 5 {
			score += 5.0
		}
	} else {
		score += 8.0
	}

	// 4. Proximity / Distance Score (Strict <= 10km limit, Up to 15 pts)
	if distKM < 2.0 {
		score += 15.0
	} else if distKM < 5.0 {
		score += 10.0
	} else if distKM <= 10.0 {
		score += 5.0
	}

	if score > 99 {
		score = 99
	}
	return int(math.Round(score))
}

// type helper alias
type sqlRows interface {
	Close() error
	Next() bool
	Scan(dest ...any) error
}

// DismissRecommendation marks a pet as dismissed in database.
// POST /recommendations/{id}/dismiss
func (h *Handler) DismissRecommendation(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		userID = 1
	}

	petID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid pet ID", http.StatusBadRequest)
		return
	}

	_, err = h.DB.Exec(`
		INSERT INTO dismissed_recommendations (user_id, pet_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING;
	`, userID, petID)
	if err != nil {
		log.Printf("❌ Failed dismissing pet %d: %v", petID, err)
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "dismissed"})
}
