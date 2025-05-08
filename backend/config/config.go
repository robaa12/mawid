package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	// Database settings
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string

	// Authentication settings
	JWTSecret  string
	ServerPort string
	AdminEmail string

	// Storage settings
	SupabaseURL       string
	SupabaseKey       string
	SupabaseBucket    string
	SupabasePublicURL string
	MaxUploadSize     int64
}

// Load Server configration
func LoadConfig() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning .env file not found. using enviroment variables")
	}

	maxUploadSize, _ := strconv.ParseInt(getEnv("MAX_UPLOAD_SIZE", "5242880"), 10, 64)

	return &Config{
		// Database settings
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("POSTGRES_USER", "postgres"),
		DBPassword: getEnv("POSTGRES_PASSWORD", "password"),
		DBName:     getEnv("POSTGRES_DB", "mawid"),

		// Auth settings
		JWTSecret:  getEnv("JWT_SECRET", "your-secret-key"),
		ServerPort: getEnv("SERVER_PORT", "8080"),
		AdminEmail: getEnv("ADMIN_EMAIL", "admin@mawid.com"),

		// Storage Settings
		SupabaseURL:       getEnv("SUPABASE_URL", ""),
		SupabaseKey:       getEnv("SUPABASE_KEY", ""),
		SupabaseBucket:    getEnv("SUPABASE_BUCKET", "event-images"),
		SupabasePublicURL: getEnv("SUPABASE_PUBLIC_URL", ""),
		MaxUploadSize:     maxUploadSize,
	}
}

func getEnv(key, defaultValue string) string {
	value, exists := os.LookupEnv(key)
	if !exists {
		return defaultValue
	}
	return value
}

func GetEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}
