package models

import "time"

type Event struct {
	ID          uint       `gorm:"primarykey" json:"id"`
	Name        string     `gorm:"size:255;not null" json:"name"`
	Description string     `gorm:"type:text" json:"description"`
	CategoryID  uint       `json:"category_id"`
	Category    Category   `gorm:"foreignKey:CategoryID" json:"category"`
	EventDate   time.Time  `json:"event_date"`
	Venue       string     `gorm:"size:255" json:"venue"`
	Price       float64    `json:"price"`
	ImageURL    string     `gorm:"size:255" json:"image_url"`
	Tags        []Tag      `gorm:"many2many:event_tags;" json:"tags"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `gorm:"index" json:"-"`
}

type Category struct {
	ID        uint       `gorm:"primarykey" json:"id"`
	Name      string     `gorm:"size:100;not null;unique" json:"name"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `gorm:"index" json:"-"`
}

type Tag struct {
	ID        uint       `gorm:"primarykey" json:"id"`
	Name      string     `gorm:"size:100;not null;unique" json:"name"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `gorm:"index" json:"-"`
}

type EventTag struct {
	EventID   uint      `gorm:"primarykey" json:"event_id"`
	TagID     uint      `gorm:"primarykey" json:"tag_id"`
	CreatedAt time.Time `json:"created_at"`
}
