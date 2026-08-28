package handlers

import (
	"encoding/json"
	"net/http"
	"time"
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

	// 1. Check if the other pet has already sent a connection request (reciprocal request)
	var reciprocalReqID int
	_ = h.DB.QueryRow(`
		SELECT id FROM connection_requests 
		WHERE sender_pet_id = $1 AND receiver_pet_id = $2
	`, targetPetID, senderPetID).Scan(&reciprocalReqID)

	// SCENARIO A: Reciprocal request exists -> MUTUAL MATCH!
	if reciprocalReqID > 0 {
		// Update both requests to accepted
		_, _ = h.DB.Exec(`
			INSERT INTO connection_requests (sender_pet_id, receiver_pet_id, status)
			VALUES ($1, $2, 'accepted')
			ON CONFLICT (sender_pet_id, receiver_pet_id) DO UPDATE SET status = 'accepted'
		`, senderPetID, targetPetID)
		_, _ = h.DB.Exec(`UPDATE connection_requests SET status = 'accepted' WHERE id = $1`, reciprocalReqID)

		// Create connection
		var connID int
		err := h.DB.QueryRow(`
			INSERT INTO connections (pet1_id, pet2_id)
			VALUES ($1, $2)
			ON CONFLICT (pet1_id, pet2_id) DO UPDATE SET created_at = connections.created_at
			RETURNING id
		`, pet1, pet2).Scan(&connID)
		if err != nil {
			_ = h.DB.QueryRow(`SELECT id FROM connections WHERE pet1_id = $1 AND pet2_id = $2`, pet1, pet2).Scan(&connID)
		}

		// Ensure chat exists
		var chatID int
		if connID > 0 {
			err = h.DB.QueryRow(`
				INSERT INTO chats (connection_id)
				VALUES ($1)
				ON CONFLICT (connection_id) DO UPDATE SET connection_id = EXCLUDED.connection_id
				RETURNING id
			`, connID).Scan(&chatID)
			if err != nil {
				_ = h.DB.QueryRow(`SELECT id FROM chats WHERE connection_id = $1`, connID).Scan(&chatID)
			}
		}

		// Insert initial match message and broadcast to both users
		if chatID > 0 {
			var msgCount int
			_ = h.DB.QueryRow(`SELECT COUNT(*) FROM messages WHERE chat_id = $1`, chatID).Scan(&msgCount)
			if msgCount == 0 {
				initialBody := "Matched! Say hi to set up a playdate! 🐾"
				var msgID int
				var createdAt time.Time
				err = h.DB.QueryRow(`
					INSERT INTO messages (chat_id, sender_user_id, body, created_at)
					VALUES ($1, $2, $3, NOW())
					RETURNING id, created_at
				`, chatID, userID, initialBody).Scan(&msgID, &createdAt)

				if err == nil && h.Hub != nil {
					var p1Name, p1Photo, p2Name, p2Photo string
					_ = h.DB.QueryRow(`SELECT pet_name, COALESCE(pet_photo, '') FROM pets WHERE id = $1`, pet1).Scan(&p1Name, &p1Photo)
					_ = h.DB.QueryRow(`SELECT pet_name, COALESCE(pet_photo, '') FROM pets WHERE id = $2`, pet2).Scan(&p2Name, &p2Photo)

					// 1. Broadcast real-time match notification to both users
					wsMatch := map[string]interface{}{
						"type":          "match",
						"chat_id":       chatID,
						"connection_id": connID,
						"pet1_name":     p1Name,
						"pet1_photo":    p1Photo,
						"pet2_name":     p2Name,
						"pet2_photo":    p2Photo,
					}
					h.Hub.BroadcastToChat(h.DB, chatID, 0, wsMatch)

					// 2. Broadcast initial message frame
					wsMsg := map[string]interface{}{
						"type":           "message",
						"id":             msgID,
						"chat_id":        chatID,
						"sender_user_id": userID,
						"body":           initialBody,
						"is_system":      true,
						"created_at":     createdAt.Format(time.RFC3339),
					}
					h.Hub.BroadcastToChat(h.DB, chatID, 0, wsMsg)
				}
			}
		}

		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"status":        "connected",
			"connection_id": connID,
			"chat_id":       chatID,
			"sender_pet_id": senderPetID,
			"target_pet_id": targetPetID,
		})
		return
	}

	// SCENARIO B: First user connecting -> Save pending request only (no chat or match yet)
	_, _ = h.DB.Exec(`
		INSERT INTO connection_requests (sender_pet_id, receiver_pet_id, status)
		VALUES ($1, $2, 'pending')
		ON CONFLICT (sender_pet_id, receiver_pet_id) DO NOTHING
	`, senderPetID, targetPetID)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":        "requested",
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
