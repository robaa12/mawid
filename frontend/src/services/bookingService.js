import api from "./api";

const bookingService = {
  // Get bookings for a specific event
    getEventBookings: async (eventId, page = 1, pageSize = 100) => {
      try {
        console.log(`Fetching bookings for event ID: ${eventId}, page: ${page}, pageSize: ${pageSize}`);
      
        // Since there's no dedicated endpoint, we'll use the admin bookings endpoint
        // and filter by event_id on the client side
        const response = await api.get(
          `/bookings/admin?page=${page}&page_size=${pageSize}`
        );
      
        console.log("Event bookings response status:", response.status);
        console.log("Event bookings response structure:", Object.keys(response.data || {}));
      
        // Handle different possible response structures
        let bookingsData = [];
        let totalPages = 1;
        let total = 0;
      
        if (response.data && response.data.success && response.data.data) {
          // Format: { success: true, data: { bookings: [...], total_pages: X } }
          bookingsData = response.data.data.bookings || [];
          totalPages = response.data.data.total_pages || 1;
          total = response.data.data.total || 0;
        } else if (response.data && response.data.bookings) {
          // Format: { bookings: [...], total_pages: X }
          bookingsData = response.data.bookings;
          totalPages = response.data.total_pages || 1;
          total = response.data.total || 0;
        } else if (Array.isArray(response.data)) {
          // Format: Direct array of bookings
          bookingsData = response.data;
          total = response.data.length;
        }
      
        console.log(`Total bookings before filtering: ${bookingsData.length}`);
      
        // Filter bookings to ensure only those matching the event_id are included
        const eventIdNum = parseInt(eventId, 10);
        const filteredBookings = bookingsData.filter(booking => 
          booking.event_id === eventIdNum || booking.event_id === eventId
        );
      
        console.log(`Found ${filteredBookings.length} bookings for event ${eventId}`);
      
        return {
          bookings: filteredBookings,
          totalPages: totalPages,
          total: filteredBookings.length
        };
      } catch (error) {
        console.error(`Error fetching bookings for event ${eventId}:`, error);
        console.error("Error details:", error.response?.data || error.message);
        throw error;
      }
    },

  // Admin: Get all bookings with pagination
  getAllBookings: async (page = 1, pageSize = 100) => {
    try {
      const response = await api.get(
        `/bookings/admin?page=${page}&page_size=${pageSize}`,
      );

      console.log("Admin bookings response:", response);

      // Handle the correct response structure
      if (response.data && response.data.success && response.data.data) {
        // For the Go API format with nested data
        const data = response.data.data;
        const totalPages = data.total_pages || 
                          (data.total && data.page_size 
                            ? Math.ceil(data.total / data.page_size) 
                            : 1);
        return {
          data: {
            bookings: data.bookings || [],
            total_pages: totalPages,
            total: data.total || 0,
            page: data.page || page,
            page_size: data.page_size || pageSize
          }
        };
      } else if (response.data && response.data.bookings) {
        // For direct bookings format
        return {
          data: {
            bookings: response.data.bookings,
            total_pages: response.data.total_pages || 1,
            total: response.data.total || response.data.bookings.length,
            page: response.data.page || page,
            page_size: response.data.page_size || pageSize
          }
        };
      } else if (Array.isArray(response.data)) {
        // For array response format
        return {
          data: {
            bookings: response.data,
            total_pages: 1,
            total: response.data.length,
            page: page,
            page_size: pageSize
          }
        };
      } else {
        // If we get here, the response doesn't match any expected format
        console.warn("Unexpected response format from admin bookings API:", response);
        
        // Create a fallback response with whatever we can find
        return {
          data: {
            bookings: response.data?.bookings || response.data?.data?.bookings || [],
            total_pages: response.data?.total_pages || response.data?.data?.total_pages || 1,
            total: response.data?.total || response.data?.data?.total || 0,
            page: page,
            page_size: pageSize
          }
        };
      }
    } catch (error) {
      console.error("Error fetching admin bookings:", error);
      throw error;
    }
  },

  // Create a new booking
  createBooking: async (eventId) => {
    try {
      console.log("Creating booking for event ID:", eventId);

      // Check the expected format by the API
      // Based on your Go backend, it likely expects: { event_id: eventId }
      const requestData = {
        event_id: parseInt(eventId), // Ensure it's sent as a number
      };

      console.log("Booking request payload:", requestData);

      const response = await api.post("/bookings", requestData);
      console.log("Booking response:", response);

      // Handle different response formats
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      } else {
        return response.data;
      }
    } catch (error) {
      console.error("Booking error:", error);
      console.error("Error response:", error.response?.data);
      throw error;
    }
  },

  // Get user's bookings with pagination
  getUserBookings: async (page = 1, pageSize = 10) => {
    try {
      const response = await api.get(
        `/bookings?page=${page}&page_size=${pageSize}`,
      );

      // Handle different response formats
      if (response.data && response.data.success && response.data.data) {
        return response.data;
      } else {
        return response;
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      throw error;
    }
  },

  // Check if a user has booked an event
  checkEventBooking: async (eventId) => {
    try {
      const response = await api.get(`/bookings/event/${eventId}`);

      // Handle different response formats
      if (response.data && response.data.success && response.data.data) {
        return response.data;
      } else {
        return response;
      }
    } catch (error) {
      console.error("Error checking booking status:", error);
      throw error;
    }
  },

  // Update booking status (confirm or cancel)
  updateBookingStatus: async (bookingId, status) => {
    try {
      // Check the expected format by the API
      const requestData = {
        status: status, // 'confirmed' or 'cancelled'
      };

      console.log("Update booking status request:", bookingId, requestData);

      // Update the endpoint to match the correct API route
      const response = await api.put(
        `/bookings/${bookingId}/status`,
        requestData,
      );

      console.log("Update booking status response:", response.data);

      // Handle different response formats
      if (response.data && response.data.success && response.data.data) {
        return response.data.data.booking || response.data.data;
      } else {
        return response.data;
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      console.error("Error details:", error.response?.data || error.message);
      throw error;
    }
  },

  // Format booking date for display
  formatBookingDate: (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  },

  // Get booking status class for styling
  getStatusClass: (status) => {
    switch (status) {
      case "confirmed":
        return "text-success";
      case "cancelled":
        return "text-danger";
      default:
        return "text-warning";
    }
  },

  // Get booking status badge class
  getStatusBadgeClass: (status) => {
    switch (status) {
      case "confirmed":
        return "bg-success";
      case "cancelled":
        return "bg-danger";
      default:
        return "bg-warning";
    }
  },
};

export default bookingService;
