package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/robaa12/mawid/config"
	"github.com/robaa12/mawid/db"
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

	userRepo := repository.NewUserRepository(database)
	err := userRepo.CreateAdminIfNotExists(cfg.AdminEmail)
	if err != nil {
		log.Printf("Failed to create admin user: %v", err)
	}

	authService := services.NewAuthService(userRepo, cfg)

	authHandler := handlers.NewAuthHandler(authService)

	router := gin.Default()
	// Setup routes
	api.SetupRoutes(router, authHandler, cfg)

	log.Printf("Server starting on port %s\n", cfg.ServerPort)
	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
