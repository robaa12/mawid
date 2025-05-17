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

	booking, err := h.BookingService.CreateBooking(userID.(uint), input)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to create booking", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Booking created successfully", booking)
}

func (h *BookingHandler) GetUserBookings(c *gin.Context) {
	uid, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	p, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	ps, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	res, err := h.BookingService.GetUserBookings(uid.(uint), p, ps)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve bookings", err.Error())
		return
	}

	if res.Total == 0 {
		utils.SuccessResponse(c, http.StatusOK, "No bookings found", res)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Bookings retrieved successfully", res)
}

func (h *BookingHandler) CheckEventBookings(c *gin.Context) {
	uid, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	evtID, err := strconv.ParseUint(c.Param("eventId"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid event ID", err.Error())
		return
	}

	has, b, err := h.BookingService.CheckUserBooking(uid.(uint), uint(evtID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to check booking", err.Error())
		return
	}

	result := gin.H{
		"has_booking": has,
	}
	if has {
		result["booking"] = b
	}

	utils.SuccessResponse(c, http.StatusOK, "Booking check completed", result)
}

func (h *BookingHandler) UpdateBookingStatus(c *gin.Context) {
	uid, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	bid, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid booking ID", err.Error())
		return
	}

	var input services.UpdateBookingStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input data", err.Error())
		return
	}

	b, err := h.BookingService.UpdateBookingStatus(uint(bid), uid.(uint), input)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to update booking status", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Booking status updated sucessfully", b)
}

func (h *BookingHandler) GetAllBookings(c *gin.Context) {
	_, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	p, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	ps, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	bs, err := h.BookingService.GetAllBookings(p, ps)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get bookings", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Bookings retrieved successfully", bs)
}
