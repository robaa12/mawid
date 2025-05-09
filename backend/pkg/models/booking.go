package models

import (
	"time"

	"gorm.io/gorm"
)

type BookingStatus string

const (
	BookingStatusConfirmed BookingStatus = "confirmed"
	BookingStatusCancelled BookingStatus = "cancelled"
)

type Booking struct {
	ID          uint          `gorm:"primarykey" json:"id"`
	UserID      uint          `json:"user_id"`
	User        User          `gorm:"foreignKey:UserID" json:"user"`
	EventID     uint          `json:"event_id"`
	Event       Event         `gorm:"foreignKey:EventID" json:"event"`
	BookingDate time.Time     `json:"booking_date"`
	Status      BookingStatus `gorm:"size:20;default:pending" json:"status"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
	DeletedAt   time.Time     `json:"_" gorm:"index"`
}

func (b *Booking) BeforeCreate(tx *gorm.DB) (err error) {
	if b.BookingDate.IsZero() {
		b.BookingDate = time.Now()
	}
	return nil
}
