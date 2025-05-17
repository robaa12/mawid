package middlewars

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/robaa12/mawid/config"
	"github.com/robaa12/mawid/internal/utils"
	"github.com/robaa12/mawid/pkg/models"
)

func AuthMidddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		// if there is no authHeader
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Extract token from bearer
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization format"})
			c.Abort()
			return
		}

		tokenString := tokenParts[1]
		claims, err := utils.ValidateToken(tokenString, cfg)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Next()
	}
}

func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Unauthorized"})
			c.Abort()
			return
		}

		// Convert role to string for reliable comparison
		roleStr := fmt.Sprintf("%v", role)
		if roleStr != string(models.RoleAdmin) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}
