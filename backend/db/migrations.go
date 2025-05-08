package db

import (
	"log"

	"github.com/robaa12/mawid/pkg/models"
	"gorm.io/gorm"
)

func RunMigrations(db *gorm.DB) error {
	log.Println("Running database migrations... ")

	err := db.AutoMigrate(&models.User{}, &models.Category{}, &models.Event{}, &models.EventTag{})
	if err != nil {
		log.Printf("Migration failed: %v", err)
		return err
	}

	log.Println("Migration completed successfully")
	return nil
}
