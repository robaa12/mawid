package api

import (
	"github.com/gin-gonic/gin"
	"github.com/robaa12/mawid/config"
	"github.com/robaa12/mawid/pkg/api/handlers"
	"github.com/robaa12/mawid/pkg/api/middlewars"
)

func SetupRoutes(router *gin.Engine, authHandler *handlers.AuthHandler, eventHandler *handlers.EventHandler, cfg *config.Config) {
	api := router.Group("/api/v1")

	auth := api.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.GET("/profile", middlewars.AuthMidddleware(cfg), authHandler.GetProfile)
	}

	events := api.Group("/events")
	{
		// Publich routes
		events.GET("", eventHandler.GetEvents)
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
}
