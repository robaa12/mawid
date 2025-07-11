package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/robaa12/mawid/internal/utils"
	"github.com/robaa12/mawid/pkg/services"
)

type EventHandler struct {
	EventService *services.EventService
}

func NewEventHandler(eventService *services.EventService) *EventHandler {
	return &EventHandler{
		EventService: eventService,
	}
}

func (h *EventHandler) CreateEvent(c *gin.Context) {
	var input services.CreateEventInput

	contentType := c.GetHeader("Content-Type")
	if contentType != "" && strings.Contains(contentType, "multipart/form-data") {
		if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Failed to parse form data", err.Error())
			return
		}

		input.Name = c.PostForm("name")
		input.Description = c.PostForm("description")
		categoryID, err := strconv.ParseUint(c.PostForm("category_id"), 10, 32)
		if err == nil {
			input.CategoryID = uint(categoryID)
		}
		input.EventDate = c.PostForm("event_date")
		input.Venue = c.PostForm("venue")
		price, err := strconv.ParseFloat(c.PostForm("price"), 64)
		if err == nil {
			input.Price = price
		}

		tagStr := c.PostForm("tags")
		if tagStr != "" {
			input.Tags = strings.Split(tagStr, ",")
			for i, tag := range input.Tags {
				input.Tags[i] = strings.TrimSpace(tag)
			}
		}
	} else {
		if err := c.ShouldBind(&input); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input data", err.Error())
			return
		}
	}

	if input.Name == "" || input.Description == "" || input.CategoryID == 0 || input.EventDate == "" || input.Venue == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Missing required fields", nil)
		return
	}

	file, _ := c.FormFile("image")

	event, err := h.EventService.CreateEvent(input, file)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to create event", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Event created successfully", event)
}

func (h *EventHandler) GetEvents(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	// Get category filter if provided
	categoryIDStr := c.Query("category_id")
	var categoryID uint
	if categoryIDStr != "" {
		parsedID, err := strconv.ParseUint(categoryIDStr, 10, 32)
		if err == nil {
			categoryID = uint(parsedID)
		}
	}

	// Returns events sorted by date (upcoming events first)
	events, err := h.EventService.GetAllEvents(page, pageSize, categoryID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve events", err.Error())
		return
	}

	if events.Total < 1 {
		utils.SuccessResponse(c, http.StatusNotFound, "No events found", nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Events retrieved successfully", events)
}

func (h *EventHandler) GetEventByID(c *gin.Context) {
	// Parse event ID
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid event ID", err.Error())
		return
	}

	// Get the event
	event, err := h.EventService.GetEventByID(uint(eventID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Event not found", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Event retrieved successfully", event)

}

func (h *EventHandler) UpdateEvent(c *gin.Context) {
	// parse event ID
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid event ID", err.Error())
		return
	}

	var input services.UpdateEventInput
	if err := c.ShouldBind(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input data", err.Error())
		return
	}

	file, _ := c.FormFile("image")

	event, err := h.EventService.UpdateEvent(uint(eventID), input, file)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to update event", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Event updated successfully", event)
}

func (h *EventHandler) DeleteEvent(c *gin.Context) {
	// Parse event ID
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid event ID", err.Error())
		return
	}

	// Delete the event
	if err := h.EventService.DeleteEvent(uint(eventID)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete event", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Event deleted successfully", nil)
}

func (h *EventHandler) SearchEvents(c *gin.Context) {
	// Get search query
	query := c.Query("q")
	if query == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Search query is required", nil)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	events, err := h.EventService.SearchEvents(query, page, pageSize)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to search events", err.Error())
		return
	}

	if events.Total < 1 {
		utils.ErrorResponse(c, http.StatusNotFound, "No events found matching your search", nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Search results", events)
}

func (h *EventHandler) GetRecentEvents(c *gin.Context) {
	events, err := h.EventService.GetRecentEvents()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve recent events", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Recent events retrieved successfully", events)
}

func (h *EventHandler) GetCategories(c *gin.Context) {
	categories, err := h.EventService.GetAllCategories()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve categories", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Categories retrieved successfully", categories)
}

func (h *EventHandler) CreateCategory(c *gin.Context) {
	var input struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input data", err.Error())
		return
	}

	category, err := h.EventService.CreateCategory(input.Name)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failedd to create category", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Category created successfully", category)
}

func (h *EventHandler) UpdateCategory(c *gin.Context) {
	// Parse category ID
	categoryID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid category ID", err.Error())
		return
	}

	var input struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input data", err.Error())
		return
	}

	category, err := h.EventService.UpdateCategory(uint(categoryID), input.Name)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to update category", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Category updated successfully", category)
}

func (h *EventHandler) DeleteCategory(c *gin.Context) {
	// parse category ID
	categoryID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid category ID", err.Error())
		return
	}

	if err := h.EventService.DeleteCategory(uint(categoryID)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete category", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Category and all its associated events deleted successfully", nil)
}
