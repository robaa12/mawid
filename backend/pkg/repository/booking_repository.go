package repository

import (
	"errors"

	"github.com/robaa12/mawid/pkg/models"
	"gorm.io/gorm"
)

type BookingRepository struct {
	DB *gorm.DB
}

func NewBookingRepository(db *gorm.DB) *BookingRepository {
	return &BookingRepository{
		DB: db,
	}
}

func (r *BookingRepository) Create(booking *models.Booking) error {
	return r.DB.Create(booking).Error
}

func (r *BookingRepository) GetByID(id uint) (*models.Booking, error) {
	var booking models.Booking
	if err := r.DB.Preload("Event").Preload("Event.Category").Preload("User").First(&booking, id).Error; err != nil {
		return nil, err
	}

	return &booking, nil
}

func (r *BookingRepository) GetUserBookings(userID uint, page, pageSize int) ([]models.Booking, int64, error) {
	var booking []models.Booking
	var total int64

	if err := r.DB.Model(&models.Booking{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	query := r.DB.Where("user_id = ?", userID).
		Preload("Event").
		Preload("Event.Category").
		Offset(offset).
		Limit(pageSize).
		Order("created_at DESC")

	if err := query.Find(&booking).Error; err != nil {
		return nil, 0, err
	}

	return booking, total, nil
}

func (r *BookingRepository) GetEventBookings(eventID uint, page, pageSize int) ([]models.Booking, int64, error) {
	var bookings []models.Booking
	var total int64

	if err := r.DB.Model(&models.Booking{}).Where("event_id=?", eventID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	query := r.DB.Where("event_id = ?", eventID).
		Preload("User").
		Offset(offset).
		Limit(pageSize).
		Order("created_at DESC")

	if err := query.Find(&bookings).Error; err != nil {
		return nil, 0, err
	}

	return bookings, total, nil
}

func (r *BookingRepository) CheckUserBooking(userID, eventID uint) (bool, *models.Booking, error) {
	var booking models.Booking

	result := r.DB.Where("user_id = ? AND event_id = ? AND status != ?", userID, eventID, models.BookingStatusCancelled).First(&booking)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return false, nil, nil
		}
		return false, nil, result.Error
	}
	return true, &booking, nil // Booking found
}

func (r *BookingRepository) UpdateStatus(id uint, status models.BookingStatus) error {
	return r.DB.Model(&models.Booking{}).Where("id = ?", id).Update("status", status).Error
}

func (r *BookingRepository) Delete(id uint) error {
	return r.DB.Delete(&models.Booking{}, id).Error
}
