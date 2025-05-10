package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/robaa12/mawid/config"
	"github.com/robaa12/mawid/db"
	"github.com/robaa12/mawid/internal/utils"
	"github.com/robaa12/mawid/pkg/api"
	"github.com/robaa12/mawid/pkg/api/handlers"
	"github.com/robaa12/mawid/pkg/repository"
	"github.com/robaa12/mawid/pkg/services"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Initialize database
	database := db.InitDB(cfg)

	// TO DO : Refactore Packages Initialization
	userRepo := repository.NewUserRepository(database)
	eventRepo := repository.NewEventRepository(database)
	bookingRepo := repository.NewBookingRepository(database)
	err := userRepo.CreateAdminIfNotExists(cfg.AdminEmail)
	if err != nil {
		log.Printf("Failed to create admin user: %v", err)
	}

	// Define Auth components
	authService := services.NewAuthService(userRepo, cfg)
	authHandler := handlers.NewAuthHandler(authService)

	// Define Event components
	storageService := utils.NewStorageService(cfg)
	eventService := services.NewEventService(eventRepo, storageService)
	eventHandler := handlers.NewEventHandler(eventService)

	// Define Bookings components
	bookingService := services.NewBookingService(bookingRepo, eventRepo, userRepo)
	bookingHandler := handlers.NewBookingHandler(bookingService)

	router := gin.Default()
	// Setup routes
	api.SetupRoutes(router, authHandler, eventHandler, bookingHandler, cfg)

	log.Printf("Server starting on port %s\n", cfg.ServerPort)
	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
