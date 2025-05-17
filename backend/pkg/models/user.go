package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Role string

const (
	RoleAdmin Role = "admin"
	RoleUser  Role = "user"
)

type User struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Name      string    `gorm:"size:100;not null" json:"name"`
	Email     string    `gorm:"size:100;not null;unique;index:idx_users_email" json:"email"`
	Password  string    `gorm:"size:100;not null" json:"-"`
	Role      Role      `gorm:"size:10;not null;default:user;index:idx_users_role" json:"role"`
	CreateAt  time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// HashPassword Method to hash users passwords
func (u *User) HashPassword() error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	u.Password = string(hashedPassword)
	return nil
}

// CheckPassword return error as nil if the comparison is valid .. if not return error value
func (u *User) CheckPassword(password string) error {
	return bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
}

// Custom Hook to hash passwordd before user creation
func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	return u.HashPassword()
}
