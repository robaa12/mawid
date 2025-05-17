package db

import (
	"fmt"
	"log"

	"github.com/robaa12/mawid/pkg/models"
	"gorm.io/gorm"
)

// SetupDatabase initializes the database with schemas and indexes
func SetupDatabase(db *gorm.DB) error {
	log.Println("Starting database initialization...")

	// Configure GORM for better performance
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to get database connection: %w", err)
	}

	// Set connection pool settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	// Auto-migrate the schemas
	log.Println("Migrating database schemas...")
	err = db.AutoMigrate(
		&models.User{},
		&models.Event{},
		&models.Category{},
		&models.Tag{},
		&models.Booking{},
	)
	if err != nil {
		return fmt.Errorf("failed to auto-migrate schemas: %w", err)
	}

	// Add indexes using GORM
	log.Println("Creating performance indexes...")
	err = addIndexes(db)
	if err != nil {
		return fmt.Errorf("failed to add indexes: %w", err)
	}

	// Add database constraints
	log.Println("Setting up database constraints...")
	if err != nil {
		return fmt.Errorf("failed to add constraints: %w", err)
	}

	log.Println("Database setup completed successfully")
	return nil
}

// addIndexes adds performance optimization indexes
func addIndexes(db *gorm.DB) error {
	// Event indexes
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_events_category_date ON events(category_id, event_date)").Error; err != nil {
		return err
	}
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date)").Error; err != nil {
		return err
	}
	// Improved name search with trigram index for better search performance
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS pg_trgm").Error; err != nil {
		log.Println("Warning: Could not create pg_trgm extension. Text search performance might be affected.")
	} else {
		if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_events_name_trgm ON events USING gin (name gin_trgm_ops)").Error; err != nil {
			log.Println("Warning: Could not create trigram index on event names. Falling back to basic index.")
			if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_events_name ON events(name)").Error; err != nil {
				return err
			}
		}
	}

	// Add index for searching events by price
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_events_price ON events(price)").Error; err != nil {
		return err
	}

	// User indexes
	if err := db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)").Error; err != nil {
		return err
	}
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)").Error; err != nil {
		return err
	}

	// Booking indexes
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON bookings(event_id)").Error; err != nil {
		return err
	}
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status)").Error; err != nil {
		return err
	}
	// Add index for booking date for more efficient sorting
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date DESC)").Error; err != nil {
		return err
	}
	// Add index for created_at for efficient sorting of latest bookings
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC)").Error; err != nil {
		return err
	}

	// Many-to-many relationship indexes
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_event_tags_event_id ON event_tags(event_id)").Error; err != nil {
		return err
	}
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_event_tags_tag_id ON event_tags(tag_id)").Error; err != nil {
		return err
	}

	log.Println("Performance optimization indexes added successfully")
	return nil
}
