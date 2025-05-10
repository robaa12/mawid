package services

import (
	"errors"
	"time"

	"github.com/robaa12/mawid/pkg/models"
	"github.com/robaa12/mawid/pkg/repository"
)

type BookingService struct {
	BookingRepo *repository.BookingRepository
	EventRepo   *repository.EventRepository
	UserRepo    *repository.UserRepository
}

type (
	CreateBookingInput struct {
		EventID uint `json:"event_id" binding:"required"`
	}

	UpdateBookingStatusInput struct {
		Status string `json:"status" binding:"required"`
	}

	BookingResponse struct {
		ID          uint        `json:"id"`
		UserID      uint        `json:"user_id"`
		User        *UserBrief  `json:"user,omitempty"`
		EventID     uint        `json:"event_id"`
		Event       *EventBrief `json:"event,omitempty"`
		BookingDate time.Time   `json:"booking_date"`
		Status      string      `json:"status"`
		CreatedAt   time.Time   `json:"created_at"`
		UpdatedAt   time.Time   `json:"updated_at"`
	}

	UserBrief struct {
		ID    uint   `json:"id"`
		Name  string `json:"name"`
		Email string `json:"email"`
	}

	EventBrief struct {
		ID       uint   `json:"id"`
		Name     string `json:"name"`
		Venue    string `json:"venue"`
		ImageURL string `json:"image_url"`
	}

	PaginatedBookings struct {
		Bookings   []BookingResponse `json:"bookings"`
		Total      int64             `json:"total"`
		Page       int               `json:"page"`
		PageSize   int               `json:"page_size"`
		TotalPages int               `json:"total_pages"`
	}
)

func NewBookingService(BookingRepo *repository.BookingRepository, eventRepo *repository.EventRepository, userRepo *repository.UserRepository) *BookingService {
	return &BookingService{
		BookingRepo: BookingRepo,
		EventRepo:   eventRepo,
		UserRepo:    userRepo,
	}
}

func (s *BookingService) CreateBooking(userID uint, input CreateBookingInput) (*BookingResponse, error) {
	_, err := s.EventRepo.GetEventByID(input.EventID)
	if err != nil {
		return nil, errors.New("event not found")
	}

	hasBooking, existingBooking, err := s.BookingRepo.CheckUserBooking(userID, input.EventID)
	if err != nil {
		return nil, err
	}

	if hasBooking {
		if existingBooking.Status == models.BookingStatusCancelled {
			existingBooking.Status = models.BookingStatusConfirmed
			existingBooking.BookingDate = time.Now()
			if err := s.BookingRepo.UpdateStatus(existingBooking.ID, models.BookingStatusConfirmed); err != nil {
				return nil, err
			}
			return s.mapBookingToResponse(*existingBooking), nil
		}
		return nil, errors.New("you have already booked this event")
	}

	booking := models.Booking{
		UserID:      userID,
		EventID:     input.EventID,
		BookingDate: time.Now(),
		Status:      models.BookingStatusConfirmed,
	}

	if err := s.BookingRepo.Create(&booking); err != nil {
		return nil, err
	}

	// Get the complete booking with relations
	createdBooking, err := s.BookingRepo.GetByID(booking.ID)
	if err != nil {
		return nil, err
	}

	return s.mapBookingToResponse(*createdBooking), nil
}

func (s *BookingService) GetUserBookings(userID uint, page, pageSize int) (*PaginatedBookings, error) {
	page, pageSize = s.normalizePagination(page, pageSize)

	bookings, total, err := s.BookingRepo.GetUserBookings(userID, page, pageSize)
	if err != nil {
		return nil, err
	}

	return s.createPaginatedResponse(bookings, total, page, pageSize)
}

func (s *BookingService) CheckUserBooking(userID, eventID uint) (bool, *BookingResponse, error) {
	hasBooking, booking, err := s.BookingRepo.CheckUserBooking(userID, eventID)
	if err != nil {
		return false, nil, err
	}

	if !hasBooking {
		return false, nil, nil
	}

	bookingResp := s.mapBookingToResponse(*booking)
	return true, bookingResp, nil
}

func (s *BookingService) UpdateBookingStatus(bookingID, userID uint, input UpdateBookingStatusInput) (*BookingResponse, error) {
	booking, err := s.BookingRepo.GetByID(bookingID)
	if err != nil {
		return nil, errors.New("booking not found")
	}

	if booking.UserID != userID {
		return nil, errors.New("unauthorized to update this booking")
	}

	var status models.BookingStatus
	switch input.Status {
	case string(models.BookingStatusConfirmed):
		status = models.BookingStatusConfirmed
	case string(models.BookingStatusCancelled):
		status = models.BookingStatusCancelled
	default:
		return nil, errors.New("invalid status")
	}

	if err := s.BookingRepo.UpdateStatus(bookingID, status); err != nil {
		return nil, err
	}

	updateBooking, err := s.BookingRepo.GetByID(bookingID)
	if err != nil {
		return nil, err
	}

	return s.mapBookingToResponse(*updateBooking), nil
}

// Helper Methods

func (s *BookingService) normalizePagination(page, pageSize int) (int, int) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}
	return page, pageSize
}

func (s *BookingService) createPaginatedResponse(bookings []models.Booking, total int64, page, pageSize int) (*PaginatedBookings, error) {
	// Initialize with empty slice
	bookingResponses := make([]BookingResponse, 0)

	for _, booking := range bookings {
		bookingResponses = append(bookingResponses, *s.mapBookingToResponse(booking))
	}

	// Calculate total pages with minimum of 1
	totalPages := 1
	if total > 0 {
		totalPages = (int(total) + pageSize - 1) / pageSize
	}

	return &PaginatedBookings{
		Bookings:   bookingResponses,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *BookingService) mapBookingToResponse(booking models.Booking) *BookingResponse {
	response := &BookingResponse{
		ID:          booking.ID,
		UserID:      booking.UserID,
		EventID:     booking.EventID,
		BookingDate: booking.BookingDate,
		Status:      string(booking.Status),
		CreatedAt:   booking.CreatedAt,
		UpdatedAt:   booking.UpdatedAt,
	}

	// Add User details if available
	if booking.User.ID != 0 {
		response.User = &UserBrief{
			ID:    booking.User.ID,
			Name:  booking.User.Name,
			Email: booking.User.Email,
		}
	}

	// Add Event details if available
	if booking.Event.ID != 0 {
		response.Event = &EventBrief{
			ID:       booking.Event.ID,
			Name:     booking.Event.Name,
			Venue:    booking.Event.Venue,
			ImageURL: booking.Event.ImageURL,
		}
	}

	return response
}
