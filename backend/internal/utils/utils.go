package utils

import (
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/robaa12/mawid/config"
	"github.com/robaa12/mawid/pkg/models"
)

type JWTClaim struct {
	UserID uint        `json:"user_id"`
	Email  string      `json:"email"`
	Role   models.Role `json:"role"`
	jwt.RegisteredClaims
}

func GenerateJWT(user models.User, cfg *config.Config) (string, time.Time, error) {
	expirationTime := time.Now().Add(24 * time.Hour)

	claims := JWTClaim{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "mawid-api",
			Subject:   fmt.Sprintf("%d", user.ID),
			ID:        fmt.Sprintf("%d-%d", user.ID, time.Now().Unix()),
		},
	}

	// Create the token using HMAC SHA256 method
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign the token with the secret key
	tokenString, err := token.SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		log.Printf("Error generating JWT: %v", err)
		return "", time.Time{}, fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, expirationTime, nil
}

// ValidateToken parses and validates a JWT token
func ValidateToken(tokenString string, cfg *config.Config) (*JWTClaim, error) {
	// Parse the token
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaim{}, func(token *jwt.Token) (any, error) {
		// Verify the signing method is what we expect
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// Return the secret key for validation
		return []byte(cfg.JWTSecret), nil
	})

	if err != nil {
		log.Printf("Token validation error: %v", err)
		return nil, fmt.Errorf("token validation failed: %w", err)
	}

	// Extract and validate claims
	claims, ok := token.Claims.(*JWTClaim)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	// Check token expiration
	if time.Now().Unix() > claims.ExpiresAt.Unix() {
		return nil, errors.New("token expired")
	}

	return claims, nil
}
