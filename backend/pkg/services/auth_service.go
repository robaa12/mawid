package services

import (
	"errors"
	"fmt"
	"log"
	"regexp"
	"strings"

	"github.com/robaa12/mawid/config"
	"github.com/robaa12/mawid/internal/utils"
	"github.com/robaa12/mawid/pkg/models"
	"github.com/robaa12/mawid/pkg/repository"
)

type AuthService struct {
	UserRepo *repository.UserRepository
	Config   *config.Config
}

type RegisterInput struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token     string       `json:"token"`
	User      *models.User `json:"user"`
	ExpiresAt int64        `json:"expires_at"`
	TokenType string       `json:"token_type"`
}

func NewAuthService(userRepo *repository.UserRepository, cfg *config.Config) *AuthService {
	return &AuthService{
		UserRepo: userRepo,
		Config:   cfg,
	}
}

func (s *AuthService) Register(input RegisterInput) (*AuthResponse, error) {
	input.Email = strings.TrimSpace(strings.ToLower(input.Email))
	input.Name = strings.TrimSpace(input.Name)

	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(input.Email) {
		return nil, errors.New("invalid email format")
	}

	// Validate password strength
	if err := validatePasswordStrength(input.Password); err != nil {
		return nil, err
	}

	// Check if the user already exists
	existingUser, err := s.UserRepo.GetByEmail(input.Email)
	if err == nil && existingUser != nil {
		log.Printf("Registration attempt with existing email: %s", input.Email)
		return nil, errors.New("user with this email already exists")
	}

	user := models.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: input.Password,
		Role:     models.RoleUser,
	}

	if err := s.UserRepo.Create(&user); err != nil {
		log.Printf("Error creating user: %v", err)
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	token, expiresAt, err := utils.GenerateJWT(user, s.Config)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	log.Printf("User registered successfully: %s", user.Email)
	return &AuthResponse{
		Token:     token,
		User:      &user,
		ExpiresAt: expiresAt.Unix(),
		TokenType: "Bearer",
	}, nil
}

func (s *AuthService) Login(input LoginInput) (*AuthResponse, error) {
	// Sanitize input
	input.Email = strings.TrimSpace(strings.ToLower(input.Email))

	// Find user by email
	user, err := s.UserRepo.GetByEmail(input.Email)
	if err != nil {
		log.Printf("Login attempt for non-existent user: %s", input.Email)
		return nil, errors.New("invalid email or password")
	}

	// Check password
	if err := user.CheckPassword(input.Password); err != nil {
		log.Printf("Failed login attempt for user: %s", user.Email)
		return nil, errors.New("invalid email or password")
	}

	// Generate JWT token with expiration time
	token, expiresAt, err := utils.GenerateJWT(*user, s.Config)
	if err != nil {
		log.Printf("Token generation error for user %s: %v", user.Email, err)
		return nil, fmt.Errorf("authentication error: %w", err)
	}

	log.Printf("Successful login for user: %s", user.Email)
	return &AuthResponse{
		Token:     token,
		User:      user,
		ExpiresAt: expiresAt.Unix(),
		TokenType: "Bearer",
	}, nil
}

func (s *AuthService) GetUserProfile(userID uint) (*models.User, error) {
	user, err := s.UserRepo.GetByID(userID)
	if err != nil {
		log.Printf("Error fetching profile for user ID %d: %v", userID, err)
		return nil, fmt.Errorf("failed to retrieve user profile: %w", err)
	}

	// Log profile access for audit purposes
	log.Printf("Profile accessed for user ID %d: %s", userID, user.Email)
	return user, nil
}

func (s *AuthService) GetAllUsers() ([]models.User, error) {
	users, err := s.UserRepo.GetAllUsers()
	if err != nil {
		log.Printf("Error fetching all users: %v", err)
		return nil, fmt.Errorf("failed to retrieve users: %w", err)
	}

	log.Printf("Admin requested all users list (%d users retrieved)", len(users))
	return users, nil
}

// Helper function to validate password strength
func validatePasswordStrength(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters long")
	}

	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
	hasLetter := regexp.MustCompile(`[a-zA-Z]`).MatchString(password)

	if !hasNumber || !hasLetter {
		return errors.New("password must contain both letters and numbers")
	}

	return nil
}
