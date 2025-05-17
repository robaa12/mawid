package services

import (
	"errors"
	"fmt"
	"mime/multipart"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/robaa12/mawid/internal/utils"
	"github.com/robaa12/mawid/pkg/models"
	"github.com/robaa12/mawid/pkg/repository"
)

type EventService struct {
	EventRepo      *repository.EventRepository
	StorageService *utils.StorageService
	BookingRepo    *repository.BookingRepository
	cache          *utils.Cache
	cacheMutex     sync.RWMutex
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

func NewEventService(eventRepo *repository.EventRepository, storageService *utils.StorageService, bookingRepo *repository.BookingRepository) *EventService {
	fmt.Println("[CACHE INIT] Creating new event service with cache")

	service := &EventService{
		EventRepo:      eventRepo,
		StorageService: storageService,
		BookingRepo:    bookingRepo,
		cache:          utils.NewCache(),
	}

	go func() {
		fmt.Println("[CACHE INIT] Populating recent events cache on startup")

		if _, err := service.cacheRecentEvents(); err != nil {
			fmt.Println("[CACHE INIT ERROR] Failed to initialize cache:", err)
		}

		ticker := time.NewTicker(2 * time.Minute)
		go func() {
			for range ticker.C {
				fmt.Println("[CACHE AUTO-REFRESH] Performing scheduled cache refresh")

				service.cacheMutex.Lock()
				service.cache.Delete("recent_events")
				service.cacheMutex.Unlock()

				if _, err := service.cacheRecentEvents(); err != nil {
					fmt.Println("[CACHE AUTO-REFRESH ERROR] Failed to refresh cache:", err)
				}
			}
		}()
	}()

	return service
}

func (s *EventService) CreateEvent(input CreateEventInput, image *multipart.FileHeader) (*EventResponse, error) {
	eventDate, err := s.parseEventDate(input.EventDate)
	if err != nil {
		return nil, err
	}

	if _, err := s.EventRepo.GetCategoryByID(input.CategoryID); err != nil {
		return nil, errors.New("category not found")
	}

	newEvent := models.Event{
		Name:        input.Name,
		Description: input.Description,
		CategoryID:  input.CategoryID,
		EventDate:   eventDate,
		Venue:       input.Venue,
		Price:       input.Price,
	}

	if image != nil {
		imgURL, err := s.StorageService.UploadFile(image)
		if err != nil {
			return nil, err
		}
		newEvent.ImageURL = imgURL
	}

	if err := s.EventRepo.Create(&newEvent); err != nil {
		if newEvent.ImageURL != "" {
			_ = s.StorageService.DeleteFile(newEvent.ImageURL)
		}
		return nil, err
	}

	go func() {
		fmt.Println("[CACHE TRIGGER] New event created, refreshing cache")
		s.cacheRecentEvents()
	}()

	if err := s.processTags(&newEvent, input.Tags); err != nil {
		return nil, err
	}

	completeEvent, err := s.EventRepo.GetEventByID(newEvent.ID)
	if err != nil {
		return nil, err
	}

	return s.mapEventToResponse(*completeEvent), nil
}

func (s *EventService) GetAllEvents(page, pageSize int, categoryID uint) (*PaginatedEvents, error) {
	page, pageSize = s.normalizePagination(page, pageSize)

	events, total, err := s.EventRepo.GetAll(page, pageSize, categoryID)
	if err != nil {
		return nil, err
	}

	return s.createPaginatedResponse(events, total, page, pageSize)
}

func (s *EventService) GetEventByID(id uint) (*EventResponse, error) {
	cacheKey := fmt.Sprintf("event_%d", id)

	s.cacheMutex.RLock()
	cachedData, found := s.cache.Get(cacheKey)
	s.cacheMutex.RUnlock()

	if found {
		if eventData, ok := cachedData.(*EventResponse); ok {
			return eventData, nil
		}
	}

	eventData, err := s.EventRepo.GetEventByID(id)
	if err != nil {
		return nil, err
	}

	result := s.mapEventToResponse(*eventData)

	s.cacheMutex.Lock()
	s.cache.Set(cacheKey, result, 5*time.Minute)
	s.cacheMutex.Unlock()

	return result, nil
}

func (s *EventService) UpdateEvent(id uint, input UpdateEventInput, image *multipart.FileHeader) (*EventResponse, error) {
	existingEvent, err := s.EventRepo.GetEventByID(id)
	if err != nil {
		return nil, errors.New("event not found")
	}

	s.updateEventFields(existingEvent, input)

	if image != nil {
		oldImg := existingEvent.ImageURL

		newImgURL, err := s.StorageService.UploadFile(image)
		if err != nil {
			return nil, err
		}
		existingEvent.ImageURL = newImgURL

		defer func() {
			if err == nil && oldImg != "" {
				_ = s.StorageService.DeleteFile(oldImg)
			}
		}()
	}

	if err := s.EventRepo.Update(existingEvent); err != nil {
		return nil, err
	}

	if input.Tags != nil {
		if err := s.updateEventTags(existingEvent, input.Tags); err != nil {
			return nil, err
		}
	}

	freshEvent, err := s.EventRepo.GetEventByID(id)
	if err != nil {
		return nil, err
	}

	eventResp := s.mapEventToResponse(*freshEvent)

	cacheKey := fmt.Sprintf("event_%d", id)
	s.cacheMutex.Lock()
	s.cache.Delete(cacheKey)
	s.cache.Set(cacheKey, eventResp, 5*time.Minute)
	s.cache.Delete("recent_events")
	s.cacheMutex.Unlock()

	go func() {
		fmt.Println("[CACHE TRIGGER] Event updated, refreshing cache")
		s.cacheRecentEvents()
	}()

	return eventResp, nil
}

func (s *EventService) SearchEvents(query string, page, pageSize int) (*PaginatedEvents, error) {
	page, pageSize = s.normalizePagination(page, pageSize)

	events, total, err := s.EventRepo.SearchByName(query, page, pageSize)
	if err != nil {
		return nil, err
	}

	return s.createPaginatedResponse(events, total, page, pageSize)
}

func (s *EventService) GetAllCategories() ([]models.Category, error) {

	categories, err := s.EventRepo.GetAllCategories()
	if err != nil {
		return nil, err
	}
	return categories, nil
}

func (s *EventService) GetCategoryByID(id uint) (*models.Category, error) {
	return s.EventRepo.GetCategoryByID(id)
}

func (s *EventService) CreateCategory(name string) (*models.Category, error) {
	category := models.Category{Name: name}
	if err := s.EventRepo.CreateCategory(&category); err != nil {
		return nil, err
	}
	return &category, nil
}

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

func (s *EventService) DeleteCategory(id uint) error {
	cat, err := s.EventRepo.GetCategoryByID(id)
	if err != nil {
		return fmt.Errorf("category not found: %w", err)
	}

	eventsToDelete, _, err := s.EventRepo.GetAll(1, 1000, id)
	if err != nil {
		return fmt.Errorf("failed to fetch events for category: %w", err)
	}

	fmt.Printf("Deleting category %s (ID: %d) with %d associated events\n",
		cat.Name, cat.ID, len(eventsToDelete))

	for _, evt := range eventsToDelete {
		if err := s.DeleteEvent(evt.ID); err != nil {
			return fmt.Errorf("failed to delete event %d: %w", evt.ID, err)
		}
	}

	return s.EventRepo.DeleteCategory(id)
}

func (s *EventService) parseEventDate(dateStr string) (time.Time, error) {
	return time.Parse("2006-01-02T15:04:05Z", dateStr)
}

func (s *EventService) normalizePagination(page, pageSize int) (int, int) {
	if page < 1 {
		page = 1
	}

	switch {
	case pageSize < 1:
		pageSize = 10
	case pageSize > 100:
		pageSize = 100
	}
	return page, pageSize
}

func (s *EventService) createPaginatedResponse(events []models.Event, total int64, page, pageSize int) (*PaginatedEvents, error) {
	eventResponses := make([]EventResponse, 0, len(events))

	for _, event := range events {
		eventResponses = append(eventResponses, *s.mapEventToResponse(event))
	}

	totalPages := 1
	if total > 0 {
		totalPages = (int(total) + pageSize - 1) / pageSize
	}

	return &PaginatedEvents{
		Events:     eventResponses,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *EventService) processTags(event *models.Event, tagNames []string) error {
	if len(tagNames) == 0 {
		return nil
	}

	var tagsToAdd []models.Tag

	for _, name := range tagNames {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}

		tag, err := s.EventRepo.FindOrCreateTag(name)
		if err != nil {
			continue
		}
		tagsToAdd = append(tagsToAdd, *tag)
	}

	if len(tagsToAdd) > 0 {
		if err := s.EventRepo.DB.Model(event).Association("Tags").Replace(tagsToAdd); err != nil {
			return fmt.Errorf("failed to associate tags with event: %w", err)
		}
	}
	return nil
}

func (s *EventService) updateEventTags(event *models.Event, tagNames []string) error {
	if err := s.EventRepo.DB.Model(event).Association("Tags").Clear(); err != nil {
		return err
	}

	return s.processTags(event, tagNames)
}

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
		parsedDate, err := s.parseEventDate(input.EventDate)
		if err == nil {
			event.EventDate = parsedDate
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

func (s *EventService) mapEventToResponse(event models.Event) *EventResponse {
	var tags []models.Tag
	if len(event.Tags) > 0 {
		tags = make([]models.Tag, len(event.Tags))
		copy(tags, event.Tags)
	}

	return &EventResponse{
		ID:          event.ID,
		Name:        event.Name,
		Description: event.Description,
		Category:    event.Category,
		EventDate:   event.EventDate,
		Venue:       event.Venue,
		Price:       event.Price,
		ImageURL:    event.ImageURL,
		Tags:        tags,
		CreatedAt:   event.CreatedAt,
		UpdatedAt:   event.UpdatedAt,
	}
}

func (s *EventService) DeleteEvent(id uint) error {
	evt, err := s.EventRepo.GetEventByID(id)
	if err != nil {
		return err
	}

	if err := s.BookingRepo.DeleteBookingsByEvent(id); err != nil {
		return fmt.Errorf("failed to delete associated bookings: %w", err)
	}

	if evt.ImageURL != "" {
		_ = s.StorageService.DeleteFile(evt.ImageURL)
	}

	err = s.EventRepo.Delete(id)

	if err == nil {
		s.cacheMutex.Lock()
		s.cache.Delete(fmt.Sprintf("event_%d", id))
		s.cache.Delete("recent_events")
		s.cacheMutex.Unlock()

		go func() {
			fmt.Println("[CACHE TRIGGER] Event deleted, refreshing cache")
			s.cacheRecentEvents()
		}()
	}

	return err
}

func (s *EventService) GetRecentEvents() (*PaginatedEvents, error) {
	s.cacheMutex.RLock()
	cachedStuff, found := s.cache.Get("recent_events")
	s.cacheMutex.RUnlock()

	shouldForceRefresh := found &&
		(len(os.Getenv("FORCE_CACHE_REFRESH")) > 0 || len(os.Getenv("DEBUG")) > 0)

	if found && !shouldForceRefresh {
		if events, ok := cachedStuff.(*PaginatedEvents); ok {
			fmt.Println("[CACHE HIT] Serving recent events from cache")
			return events, nil
		}
	}

	if !found {
		fmt.Println("[CACHE MISS] Recent events not found in cache, refreshing...")
	} else {
		fmt.Println("[CACHE REFRESH] Forcing cache refresh")
	}

	return s.cacheRecentEvents()
}

func (s *EventService) cacheRecentEvents() (*PaginatedEvents, error) {
	fmt.Println("[CACHE UPDATE] Starting recent events cache refresh")

	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	evts, _, err := s.EventRepo.GetAll(1, 8, 0)
	if err != nil {
		fmt.Println("[CACHE ERROR] Failed to fetch events for cache:", err)
		return nil, err
	}

	fmt.Println("[CACHE REFRESH] Getting fresh events from database")

	var topEvents []models.Event

	if len(evts) > 5 {
		topEvents = evts[:5]
	} else {
		topEvents = evts
	}

	result, err := s.createPaginatedResponse(topEvents, int64(len(topEvents)), 1, 5)
	if err != nil {
		return nil, err
	}

	s.cache.Set("recent_events", result, 5*time.Minute)

	fmt.Printf("[CACHE UPDATED] Cached %d recent events for 5 minutes (sorted by date with upcoming events first)\n", len(result.Events))
	return result, nil
}
