package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// ContextKey is a custom type for context keys to avoid collisions.
type ContextKey string

// UserIDKey is the context key used to store the authenticated user's ID.
const UserIDKey ContextKey = "user_id"

// Auth holds the JWT secret and provides authentication middleware.
type Auth struct {
	Secret []byte
}

// NewAuth creates a new Auth middleware with the given secret.
func NewAuth(secret string) *Auth {
	return &Auth{Secret: []byte(secret)}
}

// Required is middleware that rejects requests without a valid JWT.
// On success, it sets the user_id in the request context.
func (a *Auth) Required(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract token from "Authorization: Bearer <token>" header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			http.Error(w, `{"error":"invalid authorization format"}`, http.StatusUnauthorized)
			return
		}
		tokenStr := parts[1]

		// Parse and validate the JWT
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return a.Secret, nil
		})
		if err != nil || !token.Valid {
			http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
			return
		}

		// Extract user_id from claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, `{"error":"invalid token claims"}`, http.StatusUnauthorized)
			return
		}

		userIDFloat, ok := claims["user_id"].(float64)
		if !ok {
			http.Error(w, `{"error":"invalid user_id in token"}`, http.StatusUnauthorized)
			return
		}

		// Store user_id in context for handlers to use
		ctx := context.WithValue(r.Context(), UserIDKey, int(userIDFloat))
		next(w, r.WithContext(ctx))
	}
}

// Optional is middleware that parses JWT if present, but allows request to continue if missing.
func (a *Auth) Optional(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			ctx := context.WithValue(r.Context(), UserIDKey, 0)
			next(w, r.WithContext(ctx))
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			ctx := context.WithValue(r.Context(), UserIDKey, 0)
			next(w, r.WithContext(ctx))
			return
		}

		token, err := jwt.Parse(parts[1], func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return a.Secret, nil
		})

		if err == nil && token.Valid {
			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				if userIDFloat, ok := claims["user_id"].(float64); ok {
					ctx := context.WithValue(r.Context(), UserIDKey, int(userIDFloat))
					next(w, r.WithContext(ctx))
					return
				}
			}
		}

		ctx := context.WithValue(r.Context(), UserIDKey, 0)
		next(w, r.WithContext(ctx))
	}
}

// CORS wraps a handler with permissive CORS headers for development.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight OPTIONS requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
