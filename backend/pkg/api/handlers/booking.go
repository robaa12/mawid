package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/robaa12/mawid/internal/utils"
	"github.com/robaa12/mawid/pkg/services"
)

type BookingHandler struct {
	BookingService *services.BookingService
}

func NewBookingHandler(bookService *services.BookingService) *BookingHandler {
	return &BookingHandler{
		BookingService: bookService,
	}
}

func (h *BookingHandler) CreateBooking(c *gin.Context) {
	var input services.CreateBookingInput

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input data", err.Error())
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	booking, err := h.BookingService.CreateBooking(userID.(uint), input) // Change userID type from any to uint
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to create booking", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Booking created successfully", booking)
}

func (h *BookingHandler) GetUserBookings(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	bookings, err := h.BookingService.GetUserBookings(userID.(uint), page, pageSize)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve bookings", err.Error())
		return
	}

	if bookings.Total == 0 {
		utils.SuccessResponse(c, http.StatusOK, "No bookings found", bookings)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Bookings retrieved successfully", bookings)
}

func (h *BookingHandler) CheckEventBookings(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	eventID, err := strconv.ParseUint(c.Param("eventId"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid event ID", err.Error())
		return
	}

	hasBooking, booking, err := h.BookingService.CheckUserBooking(userID.(uint), uint(eventID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to check booking", err.Error())
		return
	}

	result := gin.H{
		"has_booking": hasBooking,
	}
	if hasBooking {
		result["booking"] = booking
	}

	utils.SuccessResponse(c, http.StatusOK, "Booking check completed", result)
}

func (h *BookingHandler) UpdateBookingStatus(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	bookingID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid booking ID", err.Error())
		return
	}

	var input services.UpdateBookingStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input data", err.Error())
		return
	}

	booking, err := h.BookingService.UpdateBookingStatus(uint(bookingID), userID.(uint), input)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to update booking status", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Booking status updated sucessfully", booking)
}
