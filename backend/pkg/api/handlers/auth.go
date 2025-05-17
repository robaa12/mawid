package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/robaa12/mawid/internal/utils"
	"github.com/robaa12/mawid/pkg/services"
)

type AuthHandler struct {
	AuthService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		AuthService: authService,
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var input services.RegisterInput

	if err := c.ShouldBindJSON(&input); err != nil {
		log.Printf("Register validation error: %v", err)
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input data", err.Error())
		return
	}

	input.Email = strings.TrimSpace(input.Email)
	input.Name = strings.TrimSpace(input.Name)

	response, err := h.AuthService.Register(input)
	if err != nil {
		log.Printf("Registration error for email %s: %v", input.Email, err)

		if strings.Contains(err.Error(), "already exists") {
			utils.ErrorResponse(c, http.StatusConflict, "Registration failed", "A user with this email already exists")
			return
		}

		utils.ErrorResponse(c, http.StatusBadRequest, "Registration failed", err.Error())
		return
	}

	log.Printf("User registered successfully: %s", input.Email)
	utils.SuccessResponse(c, http.StatusCreated, "User registered successfully", response)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input services.LoginInput

	if err := c.ShouldBindJSON(&input); err != nil {
		log.Printf("Login validation error: %v", err)
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid email or password", "Please provide a valid email and password")
		return
	}

	input.Email = strings.TrimSpace(input.Email)
	clientIP := c.ClientIP()

	response, err := h.AuthService.Login(input)
	if err != nil {
		log.Printf("Login failed for email %s from IP %s: %v", input.Email, clientIP, err)
		utils.ErrorResponse(c, http.StatusUnauthorized, "Login failed", "Invalid email or password")
		return
	}

	log.Printf("Successful login for user %s from IP %s", input.Email, clientIP)
	utils.SuccessResponse(c, http.StatusOK, "Login successful", response)
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "User not authenticated")
		return
	}

	userIDValue, ok := userID.(uint)
	if !ok {
		log.Printf("Error converting user_id to uint: %v", userID)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal server error", "Invalid user ID format")
		return
	}

	user, err := h.AuthService.GetUserProfile(userIDValue)
	if err != nil {
		log.Printf("Error retrieving profile for user ID %d: %v", userIDValue, err)

		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "record not found") {
			utils.ErrorResponse(c, http.StatusNotFound, "Profile not found", "User profile could not be found")
			return
		}

		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve user profile", "An error occurred while fetching your profile")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Profile retrieved successfully", user)
}

func (h *AuthHandler) GetAllUsers(c *gin.Context) {
	role, exists := c.Get("role")
	if !exists || role != "admin" {
		log.Printf("Unauthorized attempt to access users list. Role: %v, IP: %s", role, c.ClientIP())
		utils.ErrorResponse(c, http.StatusForbidden, "Forbidden", "Admin access required")
		return
	}

	users, err := h.AuthService.GetAllUsers()
	if err != nil {
		log.Printf("Error retrieving all users: %v", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve users", "An error occurred while fetching user data")
		return
	}

	log.Printf("Admin %v retrieved users list (%d users)", c.GetString("email"), len(users))
	utils.SuccessResponse(c, http.StatusOK, fmt.Sprintf("Retrieved %d users successfully", len(users)), users)
}
