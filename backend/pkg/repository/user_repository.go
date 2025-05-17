package repository

import (
	"github.com/robaa12/mawid/pkg/models"
	"gorm.io/gorm"
)

type UserRepository struct {
	DB *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{DB: db}
}

func (r *UserRepository) Create(user *models.User) error {
	return r.DB.Create(user).Error
}

func (r *UserRepository) GetByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByID(id uint) (*models.User, error) {
	var user models.User
	err := r.DB.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) Update(user *models.User) error {
	return r.DB.Save(user).Error
}

func (r *UserRepository) GetAllUsers() ([]models.User, error) {
	var users []models.User
	err := r.DB.Find(&users).Error
	if err != nil {
		return nil, err
	}
	return users, nil
}

func (r *UserRepository) CreateAdminIfNotExists(adminEmail string) error {
	var count int64
	r.DB.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&count)
	if count == 0 {
		admin := models.User{
			Name:     "Admin",
			Email:    adminEmail,
			Password: "admin123", // This will be hashed by the BeforeCreate hook
			Role:     models.RoleAdmin,
		}
		return r.Create(&admin)
	}
	return nil
}
