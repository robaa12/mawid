package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/robaa12/mawid/config"
	"github.com/robaa12/mawid/db"
	"github.com/robaa12/mawid/internal/utils"
	"github.com/robaa12/mawid/pkg/api"
	"github.com/robaa12/mawid/pkg/api/handlers"
	"github.com/robaa12/mawid/pkg/repository"
	"github.com/robaa12/mawid/pkg/services"
)

func testEventSorting(eventRepo *repository.EventRepository) {
	fmt.Println("Testing event sorting...")
	
	events, total, err := eventRepo.GetAll(1, 20, 0)
	if err != nil {
		fmt.Printf("Error fetching events: %v\n", err)
		return
	}
	
	now := time.Now()
	fmt.Printf("Found %d events (total: %d)\n", len(events), total)
	fmt.Println("Current time:", now.Format("2006-01-02 15:04:05"))
	fmt.Println("\nEvents sorted by date (upcoming first):")
	fmt.Println("----------------------------------------")
	
	for i, e := range events {
		tStr := ""
		if e.EventDate.After(now) {
			d := int(e.EventDate.Sub(now).Hours() / 24)
			if d == 0 {
				tStr = "TODAY!"
			} else if d == 1 {
				tStr = "TOMORROW!"
			} else {
				tStr = fmt.Sprintf("in %d days", d)
			}
			fmt.Printf("%2d. [UPCOMING] %s - %s (%s)\n", 
				i+1, e.Name, e.EventDate.Format("2006-01-02 15:04:05"), tStr)
		} else {
			d := int(now.Sub(e.EventDate).Hours() / 24)
			if d == 0 {
				tStr = "today"
			} else if d == 1 {
				tStr = "yesterday"
			} else {
				tStr = fmt.Sprintf("%d days ago", d)
			}
			fmt.Printf("%2d. [PAST    ] %s - %s (%s)\n", 
				i+1, e.Name, e.EventDate.Format("2006-01-02 15:04:05"), tStr)
		}
	}
	
	fmt.Println("\nSorting test complete.")
}

func main() {
	startTime := time.Now()
	log.Printf("Mawid server starting at %s", startTime.Format(time.RFC3339))
	
	debug := len(os.Args) > 1 && os.Args[1] == "--debug"
	if debug {
		fmt.Println("Debug mode enabled")
	}

	cfg := config.LoadConfig()
	database := db.InitDB(cfg)

	userRepo := repository.NewUserRepository(database)
	eventRepo := repository.NewEventRepository(database)
	bookingRepo := repository.NewBookingRepository(database)
	err := userRepo.CreateAdminIfNotExists(cfg.AdminEmail)
	if err != nil {
		log.Printf("Failed to create admin user: %v", err)
	}

	if len(os.Args) > 1 && os.Args[1] == "--test-sort" {
		testEventSorting(eventRepo)
		return
	}

	authService := services.NewAuthService(userRepo, cfg)
	authHandler := handlers.NewAuthHandler(authService)

	storageService := utils.NewStorageService(cfg)
	eventService := services.NewEventService(eventRepo, storageService, bookingRepo)
	eventHandler := handlers.NewEventHandler(eventService)

	bookingService := services.NewBookingService(bookingRepo, eventRepo, userRepo)
	bookingHandler := handlers.NewBookingHandler(bookingService)

	router := gin.Default()
	api.SetupRoutes(router, authHandler, eventHandler, bookingHandler, cfg)

	log.Printf("✅ Server initialized in %v", time.Since(startTime))
	log.Printf("📋 Recent events cache initialized and ready")
	fmt.Println("=================================================================")
	log.Printf("🚀 Server starting on port %s\n", cfg.ServerPort)
	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}