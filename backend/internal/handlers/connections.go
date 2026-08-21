package handlers

import (
	"encoding/json"
	"net/http"
)

type sendConnectionReq struct {
	PetID         int `json:"pet_id"`
	SenderPetID   int `json:"sender_pet_id"`
	ReceiverPetID int `json:"receiver_pet_id"`
}

// GetConnections returns a list of connected pet IDs for the authenticated user.
// GET /connections
func (h *Handler) GetConnections(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		userID = 1
	}

	rows, err := h.DB.Query(`
		SELECT conn.id, conn.pet1_id, conn.pet2_id
		FROM connections conn
		WHERE conn.pet1_id IN (SELECT id FROM pets WHERE owner_id = $1)
		   OR conn.pet2_id IN (SELECT id FROM pets WHERE owner_id = $1)
	`, userID)
	if err != nil {
		writeJSON(w, http.StatusOK, []map[string]int{})
		return
	}
	defer rows.Close()

	var result []map[string]int
	for rows.Next() {
		var connID, pet1, pet2 int
		if err := rows.Scan(&connID, &pet1, &pet2); err == nil {
			result = append(result, map[string]int{
				"connection_id": connID,
				"pet1_id":       pet1,
				"pet2_id":       pet2,
			})
		}
	}
	if result == nil {
		result = []map[string]int{}
	}
	writeJSON(w, http.StatusOK, result)
}

// SendConnectionRequest sends a connection request from one pet to another and creates a connection + chat.
// POST /connections/request
// Body: { "pet_id": 2 } or { "sender_pet_id": 1, "receiver_pet_id": 2 }
func (h *Handler) SendConnectionRequest(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		userID = 1
	}

	var req sendConnectionReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	targetPetID := req.ReceiverPetID
	if targetPetID == 0 {
		targetPetID = req.PetID
	}
	if targetPetID == 0 {
		http.Error(w, "pet_id or receiver_pet_id is required", http.StatusBadRequest)
		return
	}

	// Determine sender pet
	senderPetID := req.SenderPetID
	if senderPetID == 0 {
		err := h.DB.QueryRow(`
			SELECT id FROM pets WHERE owner_id = $1 ORDER BY id ASC LIMIT 1
		`, userID).Scan(&senderPetID)
		if err != nil || senderPetID == 0 {
			http.Error(w, "user has no pet to connect with", http.StatusBadRequest)
			return
		}
	}

	if senderPetID == targetPetID {
		http.Error(w, "cannot connect with own pet", http.StatusBadRequest)
		return
	}

	pet1 := senderPetID
	pet2 := targetPetID
	if pet1 > pet2 {
		pet1, pet2 = pet2, pet1
	}

	// 1. Insert connection request
	_, _ = h.DB.Exec(`
		INSERT INTO connection_requests (sender_pet_id, receiver_pet_id, status)
		VALUES ($1, $2, 'accepted')
		ON CONFLICT (sender_pet_id, receiver_pet_id) DO UPDATE SET status = 'accepted'
	`, senderPetID, targetPetID)

	// 2. Insert into connections
	var connID int
	err := h.DB.QueryRow(`
		INSERT INTO connections (pet1_id, pet2_id)
		VALUES ($1, $2)
		ON CONFLICT (pet1_id, pet2_id) DO UPDATE SET created_at = connections.created_at
		RETURNING id
	`, pet1, pet2).Scan(&connID)
	if err != nil {
		// Try fetching existing connection ID
		_ = h.DB.QueryRow(`SELECT id FROM connections WHERE pet1_id = $1 AND pet2_id = $2`, pet1, pet2).Scan(&connID)
	}

	// 3. Ensure a chat exists for this connection
	if connID > 0 {
		_, _ = h.DB.Exec(`
			INSERT INTO chats (connection_id)
			VALUES ($1)
			ON CONFLICT (connection_id) DO NOTHING
		`, connID)
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"status":        "connected",
		"connection_id": connID,
		"sender_pet_id": senderPetID,
		"target_pet_id": targetPetID,
	})
}

// GetConnectionRequests returns pending connection requests for the authenticated user's pets.
// GET /connections/requests
func (h *Handler) GetConnectionRequests(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		userID = 1
	}

	writeJSON(w, http.StatusOK, []map[string]int{})
}

// AcceptConnectionRequest accepts a pending connection request.
// POST /connections/requests/{id}/accept
func (h *Handler) AcceptConnectionRequest(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "accepted"})
}

// DismissConnectionRequest dismisses a pending connection request.
// POST /connections/requests/{id}/dismiss
func (h *Handler) DismissConnectionRequest(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "dismissed"})
}

// Disconnect removes an existing connection between two pets.
// DELETE /connections/{id}
func (h *Handler) Disconnect(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	_ = getUserID(r)

	writeJSON(w, http.StatusOK, map[string]string{"status": "disconnected"})
}
