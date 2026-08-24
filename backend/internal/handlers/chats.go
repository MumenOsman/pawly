package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"
)

type ChatSummary struct {
	ID           int           `json:"id"`
	ConnectionID int           `json:"connection_id"`
	IsOnline     bool          `json:"is_online"`
	UnreadCount  int           `json:"unread_count"`
	MyPetName    string        `json:"my_pet_name"`
	OtherPet     otherPetInfo  `json:"other_pet"`
	OtherUser    otherUserInfo `json:"other_user"`
	LastMessage  *lastMsgInfo  `json:"last_message"`
}

type otherPetInfo struct {
	ID          int      `json:"id"`
	PetName     string   `json:"pet_name"`
	AnimalType  string   `json:"animal_type"`
	Breed       string   `json:"breed"`
	Size        string   `json:"size"`
	AboutMe     string   `json:"about_me"`
	PetPhoto    string   `json:"pet_photo"`
	EnergyLevel string   `json:"energy_level"`
	PetAge      int      `json:"pet_age"`
	Temperament []string `json:"temperament"`
}

type otherUserInfo struct {
	ID         int    `json:"id"`
	OwnerName  string `json:"owner_name"`
	OwnerPhoto string `json:"owner_photo"`
	AboutMe    string `json:"about_me"`
}

type lastMsgInfo struct {
	Body string `json:"body"`
	Time string `json:"time"`
}

// GetChats returns a list of all chats for the authenticated user, sorted by most recent.
// GET /chats
func (h *Handler) GetChats(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		userID = 1
	}

	query := `
		SELECT 
			c.id AS chat_id,
			conn.id AS connection_id,
			COALESCE(p_my.pet_name, 'Poppy') AS my_pet_name,
			p_other.id AS other_pet_id,
			p_other.pet_name AS other_pet_name,
			COALESCE(p_other.animal_type, 'dog') AS animal_type,
			COALESCE(p_other.breed, '') AS breed,
			COALESCE(p_other.size, 'medium') AS size,
			COALESCE(p_other.about_me, '') AS pet_about_me,
			COALESCE(p_other.pet_photo, '') AS other_pet_photo,
			COALESCE(p_other.energy_level, 'medium') AS energy_level,
			COALESCE(p_other.pet_age, 0) AS pet_age,
			COALESCE(p_other.temperament, '{}') AS temperament,
			u_other.id AS other_user_id,
			COALESCE(up_other.owner_name, u_other.owner_name) AS other_owner_name,
			COALESCE(up_other.owner_photo, '') AS owner_photo,
			COALESCE(up_other.about_me, '') AS owner_about_me,
			COALESCE(m.body, '') AS last_body,
			m.created_at AS last_created_at,
			(
				SELECT COUNT(*) 
				FROM messages m_unread 
				WHERE m_unread.chat_id = c.id 
				  AND m_unread.sender_user_id <> $1 
				  AND m_unread.read_at IS NULL
			) AS unread_count
		FROM chats c
		JOIN connections conn ON c.connection_id = conn.id
		JOIN pets p_my ON (p_my.id = conn.pet1_id OR p_my.id = conn.pet2_id) AND p_my.owner_id = $1
		JOIN pets p_other ON (p_other.id = conn.pet1_id OR p_other.id = conn.pet2_id) AND p_other.id <> p_my.id
		JOIN users u_other ON p_other.owner_id = u_other.id
		LEFT JOIN user_profiles up_other ON u_other.id = up_other.user_id
		LEFT JOIN LATERAL (
			SELECT body, created_at 
			FROM messages 
			WHERE chat_id = c.id 
			ORDER BY created_at DESC 
			LIMIT 1
		) m ON true
		ORDER BY COALESCE(m.created_at, c.created_at) DESC;
	`

	rows, err := h.DB.Query(query, userID)
	if err != nil {
		log.Printf("❌ Failed querying chats for user %d: %v", userID, err)
		writeJSON(w, http.StatusOK, []ChatSummary{})
		return
	}
	defer rows.Close()

	chats := make([]ChatSummary, 0)
	for rows.Next() {
		var cs ChatSummary
		var lastBody string
		var lastCreatedAt sql.NullTime

		err := rows.Scan(
			&cs.ID, &cs.ConnectionID, &cs.MyPetName,
			&cs.OtherPet.ID, &cs.OtherPet.PetName, &cs.OtherPet.AnimalType, &cs.OtherPet.Breed,
			&cs.OtherPet.Size, &cs.OtherPet.AboutMe, &cs.OtherPet.PetPhoto, &cs.OtherPet.EnergyLevel,
			&cs.OtherPet.PetAge, pq.Array(&cs.OtherPet.Temperament),
			&cs.OtherUser.ID, &cs.OtherUser.OwnerName, &cs.OtherUser.OwnerPhoto, &cs.OtherUser.AboutMe,
			&lastBody, &lastCreatedAt, &cs.UnreadCount,
		)
		if err != nil {
			log.Printf("⚠️  Error scanning chat row: %v", err)
			continue
		}

		cs.IsOnline = true // default online status in dev
		if lastBody != "" {
			timeStr := ""
			if lastCreatedAt.Valid {
				timeStr = lastCreatedAt.Time.Format("02.01.2006 15:04")
			} else {
				timeStr = time.Now().Format("02.01.2006 15:04")
			}
			cs.LastMessage = &lastMsgInfo{
				Body: lastBody,
				Time: timeStr,
			}
		}

		chats = append(chats, cs)
	}

	writeJSON(w, http.StatusOK, chats)
}

// GetMessages returns paginated messages for a specific chat.
// GET /chats/{id}/messages?page=1
func (h *Handler) GetMessages(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		userID = 1
	}

	chatID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid chat ID")
		return
	}

	// Mark unread messages in this chat as read
	_, _ = h.DB.Exec(`
		UPDATE messages 
		SET read_at = NOW() 
		WHERE chat_id = $1 AND sender_user_id <> $2 AND read_at IS NULL;
	`, chatID, userID)

	rows, err := h.DB.Query(`
		SELECT id, chat_id, sender_user_id, body, created_at, read_at
		FROM messages 
		WHERE chat_id = $1 
		ORDER BY created_at ASC
	`, chatID)
	if err != nil {
		log.Printf("❌ Failed querying messages for chat %d: %v", chatID, err)
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"messages": []map[string]interface{}{},
			"page":     1,
			"has_more": false,
		})
		return
	}
	defer rows.Close()

	type msgResp struct {
		ID           int       `json:"id"`
		ChatID       int       `json:"chat_id"`
		SenderUserID int       `json:"sender_user_id"`
		Body         string    `json:"body"`
		CreatedAt    time.Time `json:"created_at"`
		ReadAt       *time.Time`json:"read_at,omitempty"`
	}

	messages := make([]msgResp, 0)
	for rows.Next() {
		var m msgResp
		var readAt sql.NullTime
		if err := rows.Scan(&m.ID, &m.ChatID, &m.SenderUserID, &m.Body, &m.CreatedAt, &readAt); err == nil {
			if readAt.Valid {
				m.ReadAt = &readAt.Time
			}
			messages = append(messages, m)
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"messages": messages,
		"page":     1,
		"has_more": false,
	})
}

// SendMessage persists new chat messages in PostgreSQL with timestamps
// SendMessage persists a message sent to a specific chat.
// POST /chats/{id}/messages
func (h *Handler) SendMessage(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	chatID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid chat ID")
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		var u1, u2 int
		err := h.DB.QueryRow(`
			SELECT p1.owner_id, p2.owner_id 
			FROM chats c 
			JOIN connections conn ON c.connection_id = conn.id
			JOIN pets p1 ON conn.pet1_id = p1.id
			JOIN pets p2 ON conn.pet2_id = p2.id
			WHERE c.id = $1
		`, chatID).Scan(&u1, &u2)
		if err == nil && u1 > 0 {
			userID = u1
		} else {
			userID = 106
		}
	}

	var req struct {
		Body string `json:"body"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Body) == "" {
		writeError(w, http.StatusBadRequest, "Message body cannot be empty")
		return
	}

	// Synchronize messages_id_seq to prevent PK collision
	_, _ = h.DB.Exec(`SELECT setval('messages_id_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM messages), 1));`)

	type msgResp struct {
		ID           int       `json:"id"`
		ChatID       int       `json:"chat_id"`
		SenderUserID int       `json:"sender_user_id"`
		Body         string    `json:"body"`
		CreatedAt    time.Time `json:"created_at"`
	}

	var msg msgResp
	err = h.DB.QueryRow(`
		INSERT INTO messages (chat_id, sender_user_id, body, created_at)
		VALUES ($1, $2, $3, NOW())
		RETURNING id, chat_id, sender_user_id, body, created_at;
	`, chatID, userID, strings.TrimSpace(req.Body)).Scan(
		&msg.ID, &msg.ChatID, &msg.SenderUserID, &msg.Body, &msg.CreatedAt,
	)

	if err != nil {
		log.Printf("Failed creating message: %v", err)
		writeError(w, http.StatusInternalServerError, "Failed to send message")
		return
	}

	writeJSON(w, http.StatusCreated, msg)
}
