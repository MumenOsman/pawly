package database

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

// Connect establishes a connection to the PostgreSQL database.
// It reads connection parameters from environment variables with sensible defaults.
//
// Supported env vars:
//   - DATABASE_URL  (full connection string, takes precedence)
//   - DB_HOST       (default: localhost)
//   - DB_PORT       (default: 5432)
//   - DB_USER       (default: postgres)
//   - DB_PASSWORD   (default: postgres)
//   - DB_NAME       (default: pawly)
//   - DB_SSLMODE    (default: disable)
func Connect() (*sql.DB, error) {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		host := getEnv("DB_HOST", "localhost")
		port := getEnv("DB_PORT", "5432")
		user := getEnv("DB_USER", "postgres")
		password := getEnv("DB_PASSWORD", "postgres")
		dbname := getEnv("DB_NAME", "pawly")
		sslmode := getEnv("DB_SSLMODE", "disable")

		connStr = fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			host, port, user, password, dbname, sslmode,
		)
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	return db, nil
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
