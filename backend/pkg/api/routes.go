package api

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/robaa12/mawid/config"
	"github.com/robaa12/mawid/pkg/api/handlers"
	"github.com/robaa12/mawid/pkg/api/middlewars"
)

// RateLimiterMiddleware implements a simple rate limiter
func RateLimiterMiddleware() gin.HandlerFunc {
	// Map to store client request counts with timestamps
	clients := make(map[string][]time.Time)

	return func(c *gin.Context) {
		// Get client IP
		clientIP := c.ClientIP()
		now := time.Now()
		var newTimestamps []time.Time
		for _, timestamp := range clients[clientIP] {
			if now.Sub(timestamp) < time.Minute {
				newTimestamps = append(newTimestamps, timestamp)
			}
		}
		newTimestamps = append(newTimestamps, now)
		clients[clientIP] = newTimestamps

		if len(newTimestamps) > 100 { // 100 requests per minute limit
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Try again later.",
			})
			return
		}

		c.Next()
	}
}

func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Set security headers
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		c.Header("Content-Security-Policy", "default-src 'self'")
		c.Next()
	}
}

func SetupRoutes(router *gin.Engine, authHandler *handlers.AuthHandler, eventHandler *handlers.EventHandler, bookingHandler *handlers.BookingHandler, cfg *config.Config) {
	// Global middlewares
	router.Use(gin.Recovery())
	router.Use(RateLimiterMiddleware())
	router.Use(SecurityHeadersMiddleware())

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:8000", "http://localhost:5500", "http://127.0.0.1:5500", "https://mawid-app.netlify.app", "https://*.netlify.app", "*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	api := router.Group("/api/v1")

	// Authentication routes
	auth := api.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.GET("/profile", middlewars.AuthMidddleware(cfg), authHandler.GetProfile)
	}

	// Event routes
	events := api.Group("/events")
	{
		// Public routes
		events.GET("", eventHandler.GetEvents)
		events.GET("/recent", eventHandler.GetRecentEvents)
		events.GET("/:id", eventHandler.GetEventByID)
		events.GET("/search", eventHandler.SearchEvents)
		events.GET("/categories", eventHandler.GetCategories)

		// Protected routes
		adminEvents := events.Group("")
		adminEvents.Use(middlewars.AuthMidddleware(cfg), middlewars.AdminMiddleware())
		{
			adminEvents.POST("", eventHandler.CreateEvent)
			adminEvents.PUT("/:id", eventHandler.UpdateEvent)
			adminEvents.DELETE("/:id", eventHandler.DeleteEvent)

			// Category endpoints
			adminEvents.POST("/categories", eventHandler.CreateCategory)
			adminEvents.PUT("/categories/:id", eventHandler.UpdateCategory)
			adminEvents.DELETE("/categories/:id", eventHandler.DeleteCategory)
		}
	}

	// Booking routes
	bookings := api.Group("/bookings")
	bookings.Use(middlewars.AuthMidddleware(cfg)) // All routes require authentication
	{
		bookings.POST("", bookingHandler.CreateBooking)
		bookings.GET("", bookingHandler.GetUserBookings)
		bookings.GET("/event/:eventId", bookingHandler.CheckEventBookings)
		bookings.PUT("/:id/status", bookingHandler.UpdateBookingStatus)

		bookings.OPTIONS("", func(c *gin.Context) {
			c.Status(http.StatusOK)
		})
		bookings.OPTIONS("/:id/status", func(c *gin.Context) {
			c.Status(http.StatusOK)
		})
	}

	// Admin booking routes
	adminBookings := bookings.Group("")
	adminBookings.Use(middlewars.AuthMidddleware(cfg), middlewars.AdminMiddleware())
	{
		adminBookings.GET("/admin", bookingHandler.GetAllBookings)
	}

	// Admin user routes
	adminUsers := api.Group("/users")
	adminUsers.Use(middlewars.AuthMidddleware(cfg), middlewars.AdminMiddleware())
	{
		adminUsers.GET("", authHandler.GetAllUsers)
	}
}
