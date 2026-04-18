// internal/config/config.go
package config

import (
	"fmt"
	"os"

	"github.com/rs/zerolog/log"
)

type Config struct {
	DatabaseURL string
	Port        string
	LogLevel    string
}

func Load() (*Config, error) {
	cfg := &Config{}

	// 1. Fetch individual database components
	// Using GetEnv for required fields, or GetEnvOrDefault for flexibility
	dbUser, err := GetEnv("APP_DB_USER")
	if err != nil {
		return nil, err
	}
	dbPass, err := GetEnv("APP_DB_PASSWORD")
	if err != nil {
		return nil, err
	}
	dbName, err := GetEnv("APP_DB_NAME")
	if err != nil {
		return nil, err
	}

	// Use GetEnvOrDefault for Host and Port so they fallback to local defaults
	dbHost := GetEnvOrDefault("APP_DB_HOST", "localhost")
	dbPort := GetEnvOrDefault("APP_DB_PORT", "5432")

	// 2. Build the connection string dynamically
	// Format: postgres://user:password@host:port/dbname?sslmode=disable
	cfg.DatabaseURL = fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		dbUser, dbPass, dbHost, dbPort, dbName,
	)

	log.Debug().
		Str("host", dbHost).
		Str("port", dbPort).
		Str("database", dbName).
		Msg("Constructed database URL from components")

	// 3. Load Server Configs
	cfg.Port, err = GetEnv("ECHO_PORT")
	if err != nil {
		return nil, err
	}
	cfg.Port = ":" + cfg.Port

	cfg.LogLevel, err = GetEnv("ECHO_LOG_LEVEL")
	if err != nil {
		return nil, err
	}

	return cfg, nil
}

func GetEnv(key string) (string, error) {
	if value := os.Getenv(key); value != "" {
		return value, nil
	}
	return "", fmt.Errorf("Failed to get environment variable: %s", key)
}

func GetEnvOrDefault(key string, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}