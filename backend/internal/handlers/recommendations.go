package handlers

import (
	"database/sql"
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

type idResp struct {
	ID int `json:"id"`
}

type PetPreferenceInfo struct {
	PreferredSizes        []string
	PreferredAnimalTypes  []string
	PreferredEnergyLevels []string
	MaxDistanceKM         float64
}

type ownedPetInfo struct {
	ID          int
	PetName     string
	AnimalType  string
	Size        string
	EnergyLevel string
	PetAge      int
	Temperament []string
	Latitude    float64
	Longitude   float64
	Preferences *PetPreferenceInfo
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
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 1. Verify user has completed their profile (has owner_name/location and at least one pet)
	var hasProfile bool
	err := h.DB.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM user_profiles up
			JOIN users u ON u.id = up.user_id
			WHERE up.user_id = $1 
			  AND COALESCE(NULLIF(TRIM(up.owner_name), ''), NULLIF(TRIM(u.owner_name), '')) IS NOT NULL
			  AND COALESCE(NULLIF(TRIM(up.location), ''), '') <> ''
		)
	`, userID).Scan(&hasProfile)
	if err != nil || !hasProfile {
		// User profile not completed yet -> Return empty recommendation list
		writeJSON(w, http.StatusOK, []idResp{})
		return
	}

	// 2. Fetch user's own pets
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

	// Query user's pets from DB along with their preferences
	var myPets []ownedPetInfo
	queryMyPets := `
		SELECT p.id, p.pet_name, p.animal_type, p.size, p.energy_level, COALESCE(p.pet_age, 0), 
		       COALESCE(p.temperament, '{}'), p.latitude, p.longitude,
		       COALESCE(pp.preferred_sizes, '{}'), COALESCE(pp.preferred_animal_types, '{}'),
		       COALESCE(pp.preferred_energy_levels, '{}'), COALESCE(pp.max_distance_km, 15.0)
		FROM pets p
		LEFT JOIN pet_preferences pp ON p.id = pp.pet_id
		WHERE p.owner_id = $1
	`
	if len(activePetIDs) > 0 {
		queryMyPets += ` AND p.id = ANY($2)`
	}

	var rows *sql.Rows
	if len(activePetIDs) > 0 {
		rows, err = h.DB.Query(queryMyPets, userID, pq.Array(activePetIDs))
	} else {
		rows, err = h.DB.Query(queryMyPets, userID)
	}

	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var p ownedPetInfo
			var temp, prefSizes, prefTypes, prefEnergies pq.StringArray
			var maxDist float64
			if err := rows.Scan(
				&p.ID, &p.PetName, &p.AnimalType, &p.Size, &p.EnergyLevel, &p.PetAge,
				&temp, &p.Latitude, &p.Longitude,
				&prefSizes, &prefTypes, &prefEnergies, &maxDist,
			); err == nil {
				p.Temperament = []string(temp)
				p.Preferences = &PetPreferenceInfo{
					PreferredSizes:        []string(prefSizes),
					PreferredAnimalTypes:  []string(prefTypes),
					PreferredEnergyLevels: []string(prefEnergies),
					MaxDistanceKM:         maxDist,
				}
				myPets = append(myPets, p)
			}
		}
	}

	// If user has no pets registered yet -> Profile is incomplete, return empty list
	if len(myPets) == 0 {
		writeJSON(w, http.StatusOK, []idResp{})
		return
	}

	// Collect animal types allowed for recommendation
	allowedTypes := make(map[string]bool)
	for _, mp := range myPets {
		if mp.Preferences != nil && len(mp.Preferences.PreferredAnimalTypes) > 0 {
			for _, pt := range mp.Preferences.PreferredAnimalTypes {
				if pt != "" {
					allowedTypes[strings.ToLower(pt)] = true
				}
			}
		}
		if mp.AnimalType != "" {
			allowedTypes[strings.ToLower(mp.AnimalType)] = true
		}
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
		  AND LOWER(p.animal_type) = ANY($2)
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
		  )
		LIMIT 200;
	`

	candRows, err := h.DB.Query(query, userID, pq.Array(typeList))
	if err != nil {
		log.Printf("❌ Failed querying recommendations from DB: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer candRows.Close()

	recsMap := make(map[int]PetRecommendation)

	for candRows.Next() {
		var rec PetRecommendation
		var tempArray pq.StringArray

		err := candRows.Scan(
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

		// Distance radius filter (min 1km, max 40km, default 15km)
		maxDistanceKM := 15.0
		if maxDistParam := r.URL.Query().Get("max_distance"); maxDistParam != "" {
			if md, err := strconv.ParseFloat(maxDistParam, 64); err == nil {
				if md < 1.0 {
					md = 1.0
				} else if md > 40.0 {
					md = 40.0
				}
				maxDistanceKM = md
			}
		}

		for _, myPet := range myPets {
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

			// Calculate multi-factor score including preferences
			score := calculatePetMatchScore(myPet, rec, dist)
			if score > bestScore {
				bestScore = score
				bestMatchedPetName = myPet.PetName
			}
		}

		// Filter out pets exceeding the max distance radius
		if minDistance > maxDistanceKM && r.URL.Query().Get("include_far") != "true" {
			continue
		}

		// Filter out obviously poor matches (minimum threshold cutoff of 55%)
		if bestScore < 55 {
			continue
		}

		if bestMatchedPetName == "" && len(myPets) > 0 {
			bestMatchedPetName = myPets[0].PetName
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
	// 4. Cap at maximum 10 recommendations at a time (per project specification)
	limit := 10
	if limitParam := r.URL.Query().Get("limit"); limitParam != "" {
		if l, err := strconv.Atoi(limitParam); err == nil && l > 0 && l < 10 {
			limit = l
		}
	}

	offset := 0
	if offsetParam := r.URL.Query().Get("offset"); offsetParam != "" {
		if o, err := strconv.Atoi(offsetParam); err == nil && o >= 0 {
			offset = o
		}
	}

	if offset >= len(recs) {
		recs = []PetRecommendation{}
	} else {
		end := offset + limit
		if end > len(recs) {
			end = len(recs)
		}
		recs = recs[offset:end]
	}

	idList := make([]idResp, 0, len(recs))
	for _, r := range recs {
		idList = append(idList, idResp{ID: r.ID})
	}

	writeJSON(w, http.StatusOK, idList)
}

// Calculate match score using multi-factor weighted formula:
// w1*Type + w2*Size + w3*Energy + w4*Temperament + w5*Age + w6*Location + Preferences
// Starts from 0, awards matching traits, applies heavy penalties for polar opposites.
func calculatePetMatchScore(myPet ownedPetInfo, rec PetRecommendation, distKM float64) int {
	score := 0.0

	// 1. Species / Animal Type Compatibility (25 pts max)
	myType := strings.ToLower(strings.TrimSpace(myPet.AnimalType))
	recType := strings.ToLower(strings.TrimSpace(rec.AnimalType))
	if myType == recType && myType != "" {
		score += 25.0
	} else if myPet.Preferences != nil && containsString(myPet.Preferences.PreferredAnimalTypes, recType) {
		score += 25.0
	} else {
		// Different species without explicit preference -> severe deduction
		score -= 40.0
	}

	// 2. Energy Level Compatibility (25 pts max)
	e1 := strings.ToLower(strings.TrimSpace(myPet.EnergyLevel))
	e2 := strings.ToLower(strings.TrimSpace(rec.EnergyLevel))
	if myPet.Preferences != nil && containsString(myPet.Preferences.PreferredEnergyLevels, e2) {
		score += 25.0
	} else if e1 == e2 && e1 != "" {
		score += 25.0
	} else if (e1 == "medium" || e2 == "medium") && (e1 != "" && e2 != "") {
		score += 15.0
	} else if (e1 == "low" && e2 == "high") || (e1 == "high" && e2 == "low") {
		// Polar opposite energy (e.g. hyper puppy vs elderly anxious pet) -> penalty
		score -= 20.0
	} else if e1 != "" && e2 != "" {
		score += 5.0
	}

	// 3. Size Compatibility (20 pts max)
	s1 := strings.ToLower(strings.TrimSpace(myPet.Size))
	s2 := strings.ToLower(strings.TrimSpace(rec.Size))
	if myPet.Preferences != nil && containsString(myPet.Preferences.PreferredSizes, s2) {
		score += 20.0
	} else if s1 == s2 && s1 != "" {
		score += 20.0
	} else if (s1 == "medium" || s2 == "medium") && (s1 != "" && s2 != "") {
		score += 12.0
	} else if (s1 == "small" && (s2 == "large" || s2 == "giant")) || ((s1 == "large" || s1 == "giant") && s2 == "small") {
		// Extreme size mismatch (small vs giant/large) -> penalty
		score -= 20.0
	} else if s1 != "" && s2 != "" {
		score += 5.0
	}

	// 4. Age Proximity & Stage (15 pts max)
	if myPet.PetAge > 0 && rec.PetAge > 0 {
		ageDiff := math.Abs(float64(myPet.PetAge - rec.PetAge))
		if ageDiff <= 1 {
			score += 15.0
		} else if ageDiff <= 3 {
			score += 10.0
		} else if ageDiff <= 6 {
			score += 5.0
		} else if ageDiff >= 10 {
			// Senior pet (e.g. 14yo) vs 1yo puppy -> penalty
			score -= 15.0
		}
	} else {
		score += 8.0
	}

	// 5. Temperament / Social Traits (10 pts max)
	if len(myPet.Temperament) > 0 && len(rec.Temperament) > 0 {
		overlap := 0
		for _, t1 := range myPet.Temperament {
			for _, t2 := range rec.Temperament {
				if strings.EqualFold(t1, t2) {
					overlap++
					break
				}
			}
		}
		if overlap >= 2 {
			score += 10.0
		} else if overlap == 1 {
			score += 6.0
		} else {
			score += 2.0
		}
	} else {
		score += 5.0
	}

	// 6. Proximity / Location Score (15 pts max)
	if distKM < 2.0 {
		score += 15.0
	} else if distKM < 5.0 {
		score += 10.0
	} else if distKM <= 10.0 {
		score += 5.0
	} else if distKM > 25.0 {
		score -= 5.0
	}

	if score > 99 {
		score = 99
	}
	if score < 0 {
		score = 0
	}
	return int(math.Round(score))
}

func containsString(slice []string, val string) bool {
	for _, item := range slice {
		if strings.EqualFold(strings.TrimSpace(item), strings.TrimSpace(val)) {
			return true
		}
	}
	return false
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
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
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
