package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// registerRequest is the expected JSON body for registration.
type registerRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	OwnerName   string `json:"owner_name"`
	Username    string `json:"username"`
	DateOfBirth string `json:"date_of_birth"`
}

// loginRequest is the expected JSON body for login.
type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// authResponse is returned on successful register/login.
type authResponse struct {
	ID    int    `json:"id"`
	Token string `json:"token"`
}

// Register creates a new user account.
// POST /auth/register
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	// Validate input
	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}
	if len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	// Hash password with bcrypt + salt (cost 12)
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	// Synchronize PostgreSQL sequence to avoid primary key collision with seed data
	_, _ = h.DB.Exec(`SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));`)

	// Insert user into database
	var userID int
	err = h.DB.QueryRow(
		`INSERT INTO users (email, password_hash, owner_name, username, date_of_birth) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		req.Email, string(hash), req.OwnerName, req.Username, req.DateOfBirth,
	).Scan(&userID)
	if err != nil {
		// Check for duplicate email (unique constraint violation)
		if isPgUniqueViolation(err) {
			writeError(w, http.StatusConflict, "email already registered")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	// Also create an empty profile row for the user
	_, _ = h.DB.Exec(
		`INSERT INTO user_profiles (user_id, owner_name, date_of_birth) VALUES ($1, $2, $3) 
		 ON CONFLICT (user_id) DO UPDATE SET owner_name = EXCLUDED.owner_name, date_of_birth = EXCLUDED.date_of_birth`,
		userID, req.OwnerName, req.DateOfBirth,
	)

	// Generate JWT
	token, err := h.generateJWT(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	writeJSON(w, http.StatusCreated, authResponse{
		ID:    userID,
		Token: token,
	})
}

// Login authenticates a user and returns a JWT.
// POST /auth/login
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	// Look up user by email
	var userID int
	var passwordHash string
	err := h.DB.QueryRow(
		`SELECT id, password_hash FROM users WHERE email = $1`, req.Email,
	).Scan(&userID, &passwordHash)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	// Compare password with stored hash
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	// Generate JWT
	token, err := h.generateJWT(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	writeJSON(w, http.StatusOK, authResponse{
		ID:    userID,
		Token: token,
	})
}

// generateJWT creates a signed JWT token for the given user ID.
func (h *Handler) generateJWT(userID int) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(h.JWTSecret)
}

// isPgUniqueViolation checks if a PostgreSQL error is a unique constraint violation.
func isPgUniqueViolation(err error) bool {
	return err != nil && (contains(err.Error(), "unique") || contains(err.Error(), "duplicate"))
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchString(s, substr)
}

func searchString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
