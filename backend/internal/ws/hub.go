package ws

import (
	"database/sql"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024 * 64
)

// Client represents a single active WebSocket connection.
type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	UserID int
	Send   chan []byte
}

// WSMessage represents the standard JSON message envelope across WebSockets.
type WSMessage struct {
	Type         string      `json:"type"`
	ChatID       int         `json:"chat_id,omitempty"`
	UserID       int         `json:"user_id,omitempty"`
	SenderUserID int         `json:"sender_user_id,omitempty"`
	Body         string      `json:"body,omitempty"`
	CreatedAt    string      `json:"created_at,omitempty"`
	Online       bool        `json:"online,omitempty"`
	Data         interface{} `json:"data,omitempty"`
}

// Hub manages active WebSocket connections and broadcasts.
type Hub struct {
	mu          sync.RWMutex
	clients     map[*Client]bool
	userClients map[int]map[*Client]bool
	register    chan *Client
	unregister  chan *Client
	broadcast   chan []byte
}

// NewHub creates a new Hub instance.
func NewHub() *Hub {
	return &Hub{
		clients:     make(map[*Client]bool),
		userClients: make(map[int]map[*Client]bool),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		broadcast:   make(chan []byte, 256),
	}
}

// Run starts the Hub event loop.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			if h.userClients[client.UserID] == nil {
				h.userClients[client.UserID] = make(map[*Client]bool)
			}
			isFirst := len(h.userClients[client.UserID]) == 0
			h.userClients[client.UserID][client] = true
			h.mu.Unlock()

			if isFirst {
				h.BroadcastStatus(client.UserID, true)
			}

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
				if conns, exists := h.userClients[client.UserID]; exists {
					delete(conns, client)
					if len(conns) == 0 {
						delete(h.userClients, client.UserID)
						h.mu.Unlock()
						h.BroadcastStatus(client.UserID, false)
						continue
					}
				}
			}
			h.mu.Unlock()

		case msg := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- msg:
				default:
					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// RegisterClient queues a client for registration.
func (h *Hub) RegisterClient(client *Client) {
	h.register <- client
}

// UnregisterClient queues a client for unregistration.
func (h *Hub) UnregisterClient(client *Client) {
	h.unregister <- client
}

// IsUserOnline checks if the given user currently has any active WebSocket connections.
func (h *Hub) IsUserOnline(userID int) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.userClients[userID]) > 0
}

// SendToUser sends a JSON payload to all active connections of a specific user.
func (h *Hub) SendToUser(userID int, payload interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("❌ Hub: failed marshaling payload for user %d: %v", userID, err)
		return
	}

	h.mu.RLock()
	conns, exists := h.userClients[userID]
	if !exists || len(conns) == 0 {
		h.mu.RUnlock()
		return
	}

	for c := range conns {
		select {
		case c.Send <- data:
		default:
			log.Printf("⚠️ Hub: drop message to slow client of user %d", userID)
		}
	}
	h.mu.RUnlock()
}

// BroadcastStatus notifies all connected clients of a user's online/offline status change.
func (h *Hub) BroadcastStatus(userID int, online bool) {
	msg := map[string]interface{}{
		"type":    "status",
		"user_id": userID,
		"online":  online,
	}
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.mu.RLock()
	for client := range h.clients {
		if client.UserID != userID {
			select {
			case client.Send <- data:
			default:
			}
		}
	}
	h.mu.RUnlock()
}

// BroadcastToChat sends a payload to both participants of a chat.
// If excludeUserID is provided, that specific user is skipped (e.g. sender already has optimistic state).
func (h *Hub) BroadcastToChat(db *sql.DB, chatID int, excludeUserID int, payload interface{}) {
	if db == nil {
		return
	}

	var u1, u2 int
	err := db.QueryRow(`
		SELECT p1.owner_id, p2.owner_id 
		FROM chats c 
		JOIN connections conn ON c.connection_id = conn.id
		JOIN pets p1 ON conn.pet1_id = p1.id
		JOIN pets p2 ON conn.pet2_id = p2.id
		WHERE c.id = $1
	`, chatID).Scan(&u1, &u2)
	if err != nil {
		log.Printf("❌ Hub: failed finding chat participants for chat %d: %v", chatID, err)
		return
	}

	// Send to participants
	if u1 > 0 && u1 != excludeUserID {
		log.Printf("📢 Hub: sending real-time event to participant User %d (Chat %d)", u1, chatID)
		h.SendToUser(u1, payload)
	}
	if u2 > 0 && u2 != excludeUserID {
		log.Printf("📢 Hub: sending real-time event to participant User %d (Chat %d)", u2, chatID)
		h.SendToUser(u2, payload)
	}
}

// ReadPump pumps messages from the websocket connection to the hub.
func (c *Client) ReadPump(db *sql.DB) {
	defer func() {
		log.Printf("🔌 [WebSocket] User %d disconnected", c.UserID)
		c.Hub.UnregisterClient(c)
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	_ = c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		_ = c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("⚠️ WebSocket close error (user %d): %v", c.UserID, err)
			}
			break
		}

		var wsMsg WSMessage
		if err := json.Unmarshal(message, &wsMsg); err != nil {
			continue
		}

		switch wsMsg.Type {
		case "typing":
			if wsMsg.ChatID > 0 {
				typingPayload := map[string]interface{}{
					"type":    "typing",
					"chat_id": wsMsg.ChatID,
					"user_id": c.UserID,
				}
				c.Hub.BroadcastToChat(db, wsMsg.ChatID, c.UserID, typingPayload)
			}
		}
	}
}

// WritePump pumps messages from the hub to the websocket connection.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			_, _ = w.Write(message)

			// Drain queued messages into the current write
			n := len(c.Send)
			for i := 0; i < n; i++ {
				_, _ = w.Write([]byte{'\n'})
				_, _ = w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
