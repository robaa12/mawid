package handlers

import (
	"net/http"

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
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input data", err.Error())
		return
	}

	response, err := h.AuthService.Register(input)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Registration failed", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusCreated, "User registered successfully", response)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input services.LoginInput

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid email or password", err.Error())
		return
	}

	response, err := h.AuthService.Login(input)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Login failed", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Login successful", response)
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "User not authenticated")
		return
	}

	user, err := h.AuthService.GetUserProfile(userID.(uint)) // convert userID from any to uint
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve user profile", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Profile retrieved successfully", user)
}
