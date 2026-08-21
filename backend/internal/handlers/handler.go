package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"match-me/internal/middleware"
)

// Handler holds shared dependencies for all HTTP handlers.
type Handler struct {
	DB        *sql.DB
	JWTSecret []byte
}

// New creates a new Handler with the given database connection and JWT secret.
func New(db *sql.DB, jwtSecret string) *Handler {
	return &Handler{
		DB:        db,
		JWTSecret: []byte(jwtSecret),
	}
}

// Health returns a simple health check response.
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	dbStatus := "disconnected"
	if h.DB != nil {
		if err := h.DB.Ping(); err == nil {
			dbStatus = "connected"
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status":   "ok",
		"database": dbStatus,
	})
}

// --- JSON helpers ---

// writeJSON writes a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding JSON response: %v", err)
	}
}

// writeError writes a JSON error response.
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// requireDB checks that the database is connected. Returns false and writes an error if not.
func (h *Handler) requireDB(w http.ResponseWriter) bool {
	if h.DB == nil {
		writeError(w, http.StatusServiceUnavailable, "database not connected")
		return false
	}
	return true
}

// getUserID extracts the authenticated user ID from the request context.
// Returns 0 if not found (should not happen if auth middleware is applied).
func getUserID(r *http.Request) int {
	if id, ok := r.Context().Value(middleware.UserIDKey).(int); ok {
		return id
	}
	return 0
}
