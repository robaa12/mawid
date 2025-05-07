package services

import (
	"errors"

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
	Password string `json:"password" binding:"required,min=6"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  *models.User `json:"user"`
}

func NewAuthService(userRepo *repository.UserRepository, cfg *config.Config) *AuthService {
	return &AuthService{
		UserRepo: userRepo,
		Config:   cfg,
	}
}

func (s *AuthService) Register(input RegisterInput) (*AuthResponse, error) {
	// Check if the user already exists
	existingUser, err := s.UserRepo.GetByEmail(input.Email)
	if err == nil && existingUser != nil {
		return nil, errors.New("user with this email already exists")
	}

	user := models.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: input.Password,
		Role:     models.RoleUser,
	}

	if err := s.UserRepo.Create(&user); err != nil {
		return nil, err
	}

	token, err := utils.GenerateJWT(user, s.Config)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		User:  &user,
	}, nil
}

func (s *AuthService) Login(input LoginInput) (*AuthResponse, error) {
	// Find user by email
	user, err := s.UserRepo.GetByEmail(input.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Check password
	if err := user.CheckPassword(input.Password); err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Generate JWT token
	token, err := utils.GenerateJWT(*user, s.Config)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

func (s *AuthService) GetUserProfile(userID uint) (*models.User, error) {
	return s.UserRepo.GetByID(userID)
}
