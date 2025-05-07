package api

import (
	"github.com/gin-gonic/gin"
	"github.com/robaa12/mawid/config"
	"github.com/robaa12/mawid/pkg/api/handlers"
	"github.com/robaa12/mawid/pkg/api/middlewars"
)

func SetupRoutes(router *gin.Engine, authHandler *handlers.AuthHandler, cfg *config.Config) {
	api := router.Group("/api/v1")

	auth := api.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.GET("/profile", middlewars.AuthMidddleware(cfg), authHandler.GetProfile)
	}
}
