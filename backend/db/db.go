package db

import (
	"fmt"
	"log"

	"github.com/robaa12/mawid/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB(cfg *config.Config) *gorm.DB {
	var dsn string
	
	if cfg.DatabaseURL != "" {
		// Use direct connection string if provided
		dsn = cfg.DatabaseURL
	} else {
		// Otherwise build connection string from components
		sslMode := "disable"
		if cfg.DBSSLMode != "" {
			sslMode = cfg.DBSSLMode
		}
		
		dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
			cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort, sslMode)
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Connected to database successfully")

	if err := RunMigrations(DB); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	return DB
}
