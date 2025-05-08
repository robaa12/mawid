package services

import (
	"errors"
	"mime/multipart"
	"strings"
	"time"

	"github.com/robaa12/mawid/internal/utils"
	"github.com/robaa12/mawid/pkg/models"
	"github.com/robaa12/mawid/pkg/repository"
)

type EventService struct {
	EventRepo      *repository.EventRepository
	StorageService *utils.StorageService
}

type (
	CreateEventInput struct {
		Name        string   `json:"name" binding:"required"`
		Description string   `json:"description" binding:"required"`
		CategoryID  uint     `json:"category_id" binding:"required"`
		EventDate   string   `json:"event_date" binding:"required"`
		Venue       string   `json:"venue" binding:"required"`
		Price       float64  `json:"price" binding:"required,min=0"`
		Tags        []string `json:"tags"`
	}

	UpdateEventInput struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		CategoryID  uint     `json:"category_id"`
		EventDate   string   `json:"event_date"`
		Venue       string   `json:"venue"`
		Price       float64  `json:"price"`
		Tags        []string `json:"tags"`
	}

	EventResponse struct {
		ID          uint            `json:"id"`
		Name        string          `json:"name"`
		Description string          `json:"description"`
		Category    models.Category `json:"category"`
		EventDate   time.Time       `json:"event_date"`
		Venue       string          `json:"venue"`
		Price       float64         `json:"price"`
		ImageURL    string          `json:"image_url"`
		Tags        []models.Tag    `json:"tags"`
		CreatedAt   time.Time       `json:"created_at"`
		UpdatedAt   time.Time       `json:"updated_at"`
	}

	PaginatedEvents struct {
		Events     []EventResponse `json:"events"`
		Total      int64           `json:"total"`
		Page       int             `json:"page"`
		PageSize   int             `json:"page_size"`
		TotalPages int             `json:"total_pages"`
	}
)

func NewEventService(eventRepo *repository.EventRepository, storageService *utils.StorageService) *EventService {
	return &EventService{
		EventRepo:      eventRepo,
		StorageService: storageService,
	}
}

func (s *EventService) CreateEvent(input CreateEventInput, image *multipart.FileHeader) (*EventResponse, error) {
	eventDate, err := s.parseEventDate(input.EventDate)
	if err != nil {
		return nil, err
	}

	if _, err := s.EventRepo.GetCategoryByID(input.CategoryID); err != nil {
		return nil, errors.New("category not found")
	}

	event := models.Event{
		Name:        input.Name,
		Description: input.Description,
		CategoryID:  input.CategoryID,
		EventDate:   eventDate,
		Venue:       input.Venue,
		Price:       input.Price,
	}

	if image != nil {
		imageURL, err := s.StorageService.UploadFile(image)
		if err != nil {
			return nil, err
		}
		event.ImageURL = imageURL
	}

	if err := s.EventRepo.Create(&event); err != nil {
		// Delete uploaded image if event creation fails
		if event.ImageURL != "" {
			_ = s.StorageService.DeleteFile(event.ImageURL)
		}
		return nil, err
	}

	if err := s.processTags(&event, input.Tags); err != nil {
		return nil, err
	}

	// Get the complete event with relations
	createdEvent, err := s.EventRepo.GetEventByID(event.ID)
	if err != nil {
		return nil, err
	}

	return s.mapEventToResponse(*createdEvent), nil
}

// GetAllEvents returns paginated events
func (s *EventService) GetAllEvents(page, pageSize int) (*PaginatedEvents, error) {
	page, pageSize = s.normalizePagination(page, pageSize)

	events, total, err := s.EventRepo.GetAll(page, pageSize)
	if err != nil {
		return nil, err
	}

	return s.createPaginatedResponse(events, total, page, pageSize)
}

// GetEventByID retrieves an event by its ID
func (s *EventService) GetEventByID(id uint) (*EventResponse, error) {
	event, err := s.EventRepo.GetEventByID(id)
	if err != nil {
		return nil, err
	}
	return s.mapEventToResponse(*event), nil
}

// UpdateEvent updates an existing event
func (s *EventService) UpdateEvent(id uint, input UpdateEventInput, image *multipart.FileHeader) (*EventResponse, error) {
	// Retrieve existing event
	event, err := s.EventRepo.GetEventByID(id)
	if err != nil {
		return nil, errors.New("event not found")
	}

	// Update basic fields if provided
	s.updateEventFields(event, input)

	// Handle image update
	if image != nil {
		// Store old image URL to delete after successful update
		oldImageURL := event.ImageURL

		// Upload new image
		imageURL, err := s.StorageService.UploadFile(image)
		if err != nil {
			return nil, err
		}
		event.ImageURL = imageURL

		// Delete old image after successful database update
		defer func() {
			if err == nil && oldImageURL != "" {
				_ = s.StorageService.DeleteFile(oldImageURL)
			}
		}()
	}

	// Update event in database
	if err := s.EventRepo.Update(event); err != nil {
		return nil, err
	}

	// Process tags if provided
	if input.Tags != nil {
		if err := s.updateEventTags(event, input.Tags); err != nil {
			return nil, err
		}
	}

	// Get the updated event with relations
	updatedEvent, err := s.EventRepo.GetEventByID(id)
	if err != nil {
		return nil, err
	}

	return s.mapEventToResponse(*updatedEvent), nil
}

// DeleteEvent removes an event and its associated image
func (s *EventService) DeleteEvent(id uint) error {
	// Retrieve the event to get its image URL
	event, err := s.EventRepo.GetEventByID(id)
	if err != nil {
		return err
	}

	// Delete from database
	if err := s.EventRepo.Delete(id); err != nil {
		return err
	}

	// Delete associated image if exists
	if event.ImageURL != "" {
		_ = s.StorageService.DeleteFile(event.ImageURL)
	}

	return nil
}

// SearchEvents searches for events by name
func (s *EventService) SearchEvents(query string, page, pageSize int) (*PaginatedEvents, error) {
	page, pageSize = s.normalizePagination(page, pageSize)

	events, total, err := s.EventRepo.SearchByName(query, page, pageSize)
	if err != nil {
		return nil, err
	}

	return s.createPaginatedResponse(events, total, page, pageSize)
}

// Category-related methods

// GetAllCategories returns all event categories
func (s *EventService) GetAllCategories() ([]models.Category, error) {
	return s.EventRepo.GetAllCategories()
}

// GetCategoryByID retrieves a category by its ID
func (s *EventService) GetCategoryByID(id uint) (*models.Category, error) {
	return s.EventRepo.GetCategoryByID(id)
}

// CreateCategory creates a new event category
func (s *EventService) CreateCategory(name string) (*models.Category, error) {
	category := models.Category{Name: name}
	if err := s.EventRepo.CreateCategory(&category); err != nil {
		return nil, err
	}
	return &category, nil
}

// UpdateCategory updates an existing category
func (s *EventService) UpdateCategory(id uint, name string) (*models.Category, error) {
	category, err := s.EventRepo.GetCategoryByID(id)
	if err != nil {
		return nil, errors.New("category not found")
	}
	category.Name = name
	if err := s.EventRepo.UpdateCategory(category); err != nil {
		return nil, err
	}
	return category, nil
}

// DeleteCategory removes a category if not used by any event
func (s *EventService) DeleteCategory(id uint) error {
	// TODO: Add check to prevent deletion of categories in use
	return s.EventRepo.DeleteCategory(id)
}

// Helper Methods

// parseEventDate parses date string to time.Time
func (s *EventService) parseEventDate(dateStr string) (time.Time, error) {
	return time.Parse("2006-01-02T15:04:05Z", dateStr)
}

// normalizePagination ensures valid pagination parameters
func (s *EventService) normalizePagination(page, pageSize int) (int, int) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}
	return page, pageSize
}

// createPaginatedResponse builds a paginated response
func (s *EventService) createPaginatedResponse(events []models.Event, total int64, page, pageSize int) (*PaginatedEvents, error) {
	var eventResponses []EventResponse
	for _, event := range events {
		eventResponses = append(eventResponses, *s.mapEventToResponse(event))
	}

	totalPages := (int(total) + pageSize - 1) / pageSize
	return &PaginatedEvents{
		Events:     eventResponses,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// processTags associates tags with an event
func (s *EventService) processTags(event *models.Event, tagNames []string) error {
	if len(tagNames) == 0 {
		return nil
	}

	var tags []models.Tag
	for _, name := range tagNames {
		if name = strings.TrimSpace(name); name == "" {
			continue
		}
		tag, err := s.EventRepo.FindOrCreateTag(name)
		if err != nil {
			continue
		}
		tags = append(tags, *tag)
	}

	if len(tags) > 0 {
		s.EventRepo.DB.Model(event).Association("Tags").Append(tags)
	}
	return nil
}

// updateEventTags replaces existing tags with new ones
func (s *EventService) updateEventTags(event *models.Event, tagNames []string) error {
	// Clear existing tags
	if err := s.EventRepo.DB.Model(event).Association("Tags").Clear(); err != nil {
		return err
	}

	// Add new tags
	return s.processTags(event, tagNames)
}

// updateEventFields updates fields of an event if new values are provided
func (s *EventService) updateEventFields(event *models.Event, input UpdateEventInput) error {
	if input.Name != "" {
		event.Name = input.Name
	}

	if input.Description != "" {
		event.Description = input.Description
	}

	if input.CategoryID != 0 {
		if _, err := s.EventRepo.GetCategoryByID(input.CategoryID); err != nil {
			return errors.New("category not found")
		}
		event.CategoryID = input.CategoryID
	}

	if input.EventDate != "" {
		if date, err := s.parseEventDate(input.EventDate); err == nil {
			event.EventDate = date
		} else {
			return errors.New("invalid date format")
		}
	}

	if input.Venue != "" {
		event.Venue = input.Venue
	}

	if input.Price >= 0 {
		event.Price = input.Price
	}

	return nil
}

// mapEventToResponse converts a model to a response DTO
func (s *EventService) mapEventToResponse(event models.Event) *EventResponse {
	return &EventResponse{
		ID:          event.ID,
		Name:        event.Name,
		Description: event.Description,
		Category:    event.Category,
		EventDate:   event.EventDate,
		Venue:       event.Venue,
		Price:       event.Price,
		ImageURL:    event.ImageURL,
		Tags:        event.Tags,
		CreatedAt:   event.CreatedAt,
		UpdatedAt:   event.UpdatedAt,
	}
}
