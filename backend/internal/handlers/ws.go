package handlers

import (
	"log"
	"net/http"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"

	"match-me/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow development frontend origins
	},
}

// HandleWebSocket handles incoming WebSocket upgrade requests.
// GET /ws?token=<jwt>
func (h *Handler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	tokenStr := r.URL.Query().Get("token")
	if tokenStr == "" {
		http.Error(w, "Unauthorized: missing token", http.StatusUnauthorized)
		return
	}

	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return h.JWTSecret, nil
	})
	if err != nil || !token.Valid {
		http.Error(w, "Unauthorized: invalid token", http.StatusUnauthorized)
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		http.Error(w, "Unauthorized: invalid token claims", http.StatusUnauthorized)
		return
	}

	userIDFloat, ok := claims["user_id"].(float64)
	if !ok {
		http.Error(w, "Unauthorized: invalid user_id", http.StatusUnauthorized)
		return
	}
	userID := int(userIDFloat)

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("❌ Failed upgrading to websocket: %v", err)
		return
	}

	client := &ws.Client{
		Hub:    h.Hub,
		Conn:   conn,
		UserID: userID,
		Send:   make(chan []byte, 256),
	}

	log.Printf("🔌 [WebSocket] User %d connected", userID)
	h.Hub.RegisterClient(client)

	go client.WritePump()
	go client.ReadPump(h.DB)
}
