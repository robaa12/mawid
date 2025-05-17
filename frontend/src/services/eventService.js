import api from "./api";

/**
 * Event service for handling all event-related API requests
 * Provides methods for fetching, filtering, and managing events
 */
const eventService = {
  /**
   * Fetches the 5 most recent upcoming events 
   * Uses server-side caching for better performance
   * @param {boolean} forceFresh - If true, adds a cache-busting parameter
   * @returns {Promise<Object>} Promise resolving to recent events data
   */
  getRecentEvents: async (forceFresh = false) => {
    try {
      console.log('Fetching recent events from cache');
      // Add cache-busting parameter if forceFresh is true, also request more events (12) to have enough after filtering
      const cacheBuster = forceFresh ? `?_=${Date.now()}&page_size=12` : '?page_size=12';
      const response = await api.get(`/events/recent${cacheBuster}`);
      console.log('Recent events response (requesting extended set for filtering):', response);

      // Handle different possible response structures
      if (response.data && response.data.success && response.data.data) {
        return {
          data: {
            events: response.data.data.events || [],
            total_pages: response.data.data.total_pages || 1,
          },
        };
      } else if (response.data && response.data.events) {
        return {
          data: {
            events: response.data.events,
            total_pages: response.data.total_pages || 1,
          },
        };
      } else {
        console.error("Unexpected recent events response format:", response.data);
        return {
          data: {
            events: [],
            total_pages: 0,
          },
        };
      }
    } catch (error) {
      console.error("Error fetching recent events:", error);
      throw error;
    }
  },

  /**
   * Fetches all events with pagination
   * @param {number} page - The page number to fetch (default: 1)
   * @param {number} pageSize - Number of events per page (default: 10)
   * @param {number|null} categoryId - Optional category ID to filter by
   * @returns {Promise<Object>} Promise resolving to event data
   */
  /**
   * Fetches all events with pagination and optional category filtering
   * 
   * @param {number} page - The page number to fetch (default: 1)
   * @param {number} pageSize - Number of events per page (default: 10)
   * @param {number|null} categoryId - Optional category ID to filter events by
   * @returns {Promise<Object>} Promise resolving to paginated events data
   */
  getAllEvents: async (page = 1, pageSize = 10, categoryId = null) => {
    try {
      // Build the URL with appropriate query parameters
      let url = `/events?page=${page}&page_size=${pageSize}`;
      
      // Add category filter if provided - this uses server-side filtering
      if (categoryId) {
        url += `&category_id=${categoryId}`;
      }
      
      console.log(`Fetching events for page ${page} with pageSize ${pageSize}${categoryId ? ', category: ' + categoryId : ''}`);
      const response = await api.get(url);
      console.log("Raw events response:", response);

      // Handle different possible response structures
      if (response.data && response.data.success && response.data.data) {
        // Go API response format: { success: true, message: "...", data: { events: [...], total_pages: X } }
        return {
          data: {
            events: response.data.data.events || [],
            total_pages: response.data.data.total_pages || 1,
          },
        };
      } else if (response.data && response.data.events) {
        // Alternative direct format: { events: [...], total_pages: X }
        return {
          data: {
            events: response.data.events,
            total_pages: response.data.total_pages || 1,
          },
        };
      } else {
        console.error("Unexpected events response format:", response.data);
        return {
          data: {
            events: [],
            total_pages: 0,
          },
        };
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      throw error;
    }
  },

  /**
   * Fetches a single event by its ID
   * @param {number} id - The event ID to fetch
   * @returns {Promise<Object>} Promise resolving to event data
   */
  getEventById: async (id) => {
    try {
      const response = await api.get(`/events/${id}`);
      console.log("Get event by ID response:", response);

      // Handle different response structures
      let eventData;

      if (response.data && response.data.success && response.data.data) {
        // Format: { success: true, message: "...", data: {...} }
        eventData = response.data.data;
      } else if (response.data) {
        // Format: direct event object
        eventData = response.data;
      } else {
        throw new Error("Failed to get event details");
      }

      // Ensure price is a number or default to 0
      if (eventData) {
        eventData.price =
          eventData.price !== undefined ? Number(eventData.price) : 0;
      }

      return { data: eventData };
    } catch (error) {
      console.error(`Error fetching event with id ${id}:`, error);
      throw error;
    }
  },

  /**
   * Searches events by keyword with pagination
   * @param {string} query - The search term
   * @param {number} page - The page number (default: 1)
   * @param {number} pageSize - Number of results per page (default: 10)
   * @returns {Promise<Object>} Promise resolving to search results
   */
  searchEvents: async (query, page = 1, pageSize = 10) => {
    try {
      console.log(`Searching events with query "${query}" for page ${page}`);
      const response = await api.get(
        `/events/search?q=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`,
      );
      console.log("Search response:", response);

      // Handle different possible response structures
      let eventsData = [];
      let totalPages = 1;

      if (response && response.data) {
        // API might return { success, message, data: { events, total_pages } }
        if (response.data.data && response.data.success) {
          eventsData = response.data.data.events || [];
          totalPages = response.data.data.total_pages || 1;
        }
        // Or it might return { events, total_pages } directly
        else {
          eventsData = response.data.events || [];
          totalPages = response.data.total_pages || 1;
        }
      }

      return {
        data: {
          events: eventsData,
          total_pages: totalPages,
        },
      };
    } catch (error) {
      console.error("Error searching events:", error);
      throw error;
    }
  },

  /**
   * Fetches all available event categories
   * @returns {Promise<Object>} Promise resolving to categories data
   */
  getCategories: async () => {
    try {
      console.log("Making categories API request...");
      const response = await api.get("/events/categories");
      console.log("Raw categories API response:", response);

      // Handle different possible response structures
      if (response.data && response.data.success && response.data.data) {
        // Format: { success: true, message: "...", data: [...] }
        return {
          data: response.data.data,
        };
      } else if (Array.isArray(response.data)) {
        // Format: direct array
        return {
          data: response.data,
        };
      } else if (response.data && typeof response.data === 'object') {
        // Try to extract categories array from response
        const possibleArrays = Object.values(response.data).filter(val => 
          Array.isArray(val) && val.length > 0 && val[0] && val[0].id
        );
        
        if (possibleArrays.length > 0) {
          return {
            data: possibleArrays[0],
          };
        }
      }
      
      // Just return whatever we got
      return response;
    } catch (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
  },
  
  /**
   * Fetches events filtered by category with pagination
   * Uses server-side filtering for optimal performance
   * @param {number|string} categoryId - ID of the category to filter by
   * @param {number} page - The page number (default: 1)
   * @param {number} pageSize - Number of results per page (default: 10)
   * @returns {Promise<Object>} Promise resolving to filtered events data
   */
  /**
   * Fetches events filtered by category using server-side filtering
   * This is a convenience wrapper around getAllEvents with a category filter
   * 
   * @param {number|string} categoryId - ID of the category to filter by
   * @param {number} page - The page number to fetch (default: 1)
   * @param {number} pageSize - Number of events per page (default: 10)
   * @returns {Promise<Object>} Promise resolving to filtered events data
   */
  getEventsByCategory: async (categoryId, page = 1, pageSize = 10) => {
    try {
      console.log(`Fetching events for category ${categoryId}, page ${page}`);
      // Use the getAllEvents method with a category filter parameter
      // This ensures we use server-side filtering for better performance
      return await eventService.getAllEvents(page, pageSize, categoryId);
    } catch (error) {
      console.error(`Error fetching events for category ${categoryId}:`, error);
      throw error;
    }
  },

  /**
   * Creates a new event (admin only)
   * Handles both text fields and file uploads using FormData
   * @param {Object} eventData - Event data including name, description, category, etc.
   * @returns {Promise<Object>} Promise resolving to created event data
   */
  createEvent: async (eventData) => {
    try {
      console.log("Creating event with data:", eventData);

      // Create a FormData object for the multipart request
      const formData = new FormData();
      
      // Add all required fields first to ensure they're included
      formData.append("name", eventData.name);
      formData.append("description", eventData.description);
      formData.append("category_id", eventData.category_id);
      formData.append("venue", eventData.venue);
      formData.append("price", eventData.price);
      
      // Format and add the event date
      if (eventData.event_date) {
        // Make sure the date is properly formatted for the API
        const eventDate = new Date(eventData.event_date);
        if (!isNaN(eventDate.getTime())) {
          formData.append("event_date", eventDate.toISOString());
        } else {
          console.error("Invalid event date format:", eventData.event_date);
          throw new Error("Invalid event date format");
        }
      } else {
        console.error("Missing event date");
        throw new Error("Event date is required");
      }
      
      // Handle tags properly
      if (eventData.tags) {
        if (Array.isArray(eventData.tags)) {
          formData.append("tags", eventData.tags.join(","));
        } else if (typeof eventData.tags === "string") {
          formData.append("tags", eventData.tags);
        }
      }
      
      // Add image file if present
      if (eventData.image && eventData.image instanceof File) {
        formData.append("image", eventData.image);
        console.log(`Adding image: ${eventData.image.name} (${eventData.image.type}, ${eventData.image.size} bytes)`);
      }
      
      // Debug logging of form data
      console.log("FormData contents:");
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: [File: ${value.name}, ${value.type}, ${value.size} bytes]`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
      
      // Send the request without manually setting Content-Type
      // The browser will set the correct multipart boundary automatically
      const response = await api.post("/events", formData);
      
      console.log("Create event response:", response);
      return response;
    } catch (error) {
      console.error("Error creating event:", error);
      console.error("Error response:", error.response);

      // Log more details about the error if available
      if (error.response) {
        console.error("Error status:", error.response.status);
        console.error("Error data:", error.response.data);
        console.error("Error headers:", error.response.headers);
      }

      throw error;
    }
  },

  /**
   * Updates an existing event (admin only)
   * Handles both JSON and FormData requests based on presence of image
   * @param {number} id - ID of the event to update
   * @param {Object} eventData - Updated event data
   * @returns {Promise<Object>} Promise resolving to updated event data
   */
  updateEvent: async (id, eventData) => {
    try {
      console.log("UpdateEvent received data:", eventData);
      
      // If we have an image, use FormData
      if (eventData.image) {
        // Handle FormData for file uploads
        const formData = new FormData();

        // Add all text fields
        Object.keys(eventData).forEach((key) => {
          if (key !== "image" && key !== "tags") {
            // Ensure description is properly encoded
            if (key === "description") {
              console.log(`Adding description to form: "${eventData[key]}"`);
            }
            formData.append(key, eventData[key]);
          }
        });

        // Add tags as comma-separated string if present
        if (eventData.tags && Array.isArray(eventData.tags)) {
          formData.append("tags", eventData.tags.join(","));
        }

        // Add image file if present
        formData.append("image", eventData.image);

        // Log formData to debug what's being sent (cannot directly console.log FormData)
        console.log("FormData entries being sent:");
        for (let pair of formData.entries()) {
          console.log(pair[0] + ': ' + pair[1]);
        }

        const response = await api.put(`/events/${id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        console.log("Update response received:", response);
        return response;
      } else {
        // No image, use JSON format that matches UpdateEventInput struct
        const jsonData = {
          name: eventData.name,
          description: eventData.description || "",
          category_id: parseInt(eventData.category_id),
          event_date: eventData.event_date,
          venue: eventData.venue,
          price: parseFloat(eventData.price),
          tags: Array.isArray(eventData.tags) 
            ? eventData.tags 
            : typeof eventData.tags === 'string' 
              ? eventData.tags.split(',').map(tag => tag.trim())
              : []
        };
        
        console.log("Sending JSON data:", jsonData);
        
        const response = await api.put(`/events/${id}`, jsonData, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        console.log("Update response received:", response);
        return response;
      }
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  },

  /**
   * Deletes an event by ID (admin only)
   * @param {number} id - ID of the event to delete
   * @returns {Promise<Object>} Promise resolving to deletion confirmation
   */
  deleteEvent: async (id) => {
    try {
      const response = await api.delete(`/events/${id}`);
      return response;
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  },

  /**
   * Creates a new event category (admin only)
   * @param {Object} categoryData - Category data (name, etc.)
   * @returns {Promise<Object>} Promise resolving to created category data
   */
  createCategory: async (categoryData) => {
    try {
      console.log("Creating category with data:", categoryData);
      const response = await api.post("/events/categories", categoryData);
      console.log("Create category response:", response);
      
      // Process the response to handle different API return formats
      if (response.data && response.data.success && response.data.data) {
        // For the standard API format with nested data structure
        return {
          data: response.data.data,
        };
      } else if (response.data && response.data.category) {
        // For format with category field
        return {
          data: response.data.category,
        };
      } else if (response.data) {
        // For direct object return format
        return {
          data: response.data,
        };
      }
      return response;
    } catch (error) {
      console.error("Error creating category:", error);
      console.error("Error response:", error.response?.data);
      throw error;
    }
  },

  /**
   * Updates an existing category (admin only)
   * @param {number} id - ID of the category to update
   * @param {Object} categoryData - Updated category data
   * @returns {Promise<Object>} Promise resolving to updated category
   */
  updateCategory: async (id, categoryData) => {
    try {
      console.log(`Updating category #${id} with data:`, categoryData);
      const response = await api.put(`/events/categories/${id}`, categoryData);
      console.log("Update category response:", response);
      
      // Process the response to handle different API return formats
      if (response.data && response.data.success && response.data.data) {
        // For the standard API format with nested data structure
        return {
          data: response.data.data,
        };
      } else if (response.data) {
        // For direct object return format
        return {
          data: response.data,
        };
      }
      return response;
    } catch (error) {
      console.error("Error updating category:", error);
      console.error("Error response:", error.response?.data);
      throw error;
    }
  },

  /**
   * Deletes a category by ID (admin only)
   * @param {number} id - ID of the category to delete
   * @returns {Promise<Object>} Promise resolving to deletion confirmation
   */
  deleteCategory: async (id) => {
    try {
      console.log(`Deleting category #${id}`);
      const response = await api.delete(`/events/categories/${id}`);
      console.log("Delete category response:", response);
      return response;
    } catch (error) {
      console.error("Error deleting category:", error);
      console.error("Error response:", error.response?.data);
      throw error;
    }
  },


};

export default eventService;
