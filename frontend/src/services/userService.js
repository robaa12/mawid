import api from "./api";

const userService = {
  // Get all users (admin only)
  getAllUsers: async (page = 1, limit = 10) => {
    try {
      const response = await api.get(`/users`, {
        params: { page, limit }
      });
      
      // Check the response structure
      if (response.data && response.data.success && response.data.data) {
        return response.data.data; // Return the data object with users
      } else if (response.data) {
        // Alternative response structure
        return response.data;
      } else {
        // Unexpected response format
        console.error("Unexpected getAllUsers response format:", response.data);
        throw new Error("Unexpected response format from server");
      }
    } catch (error) {
      console.error("Get all users error:", error);
      throw error;
    }
  },
  
  // Get user by ID (admin only)
  getUserById: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}`);
      
      // Check the response structure
      if (response.data && response.data.success && response.data.data) {
        return response.data.data; // Return the user data
      } else if (response.data) {
        return response.data; // Alternative: direct user object
      } else {
        console.error("Unexpected getUserById response format:", response.data);
        throw new Error("Failed to get user");
      }
    } catch (error) {
      console.error("Get user by ID error:", error);
      throw error;
    }
  },
  
  // Update user (admin only)
  updateUser: async (userId, userData) => {
    try {
      const response = await api.put(`/users/${userId}`, userData);
      
      // Check the response structure
      if (response.data && response.data.success && response.data.data) {
        return response.data.data; // Return updated user data
      } else if (response.data) {
        return response.data; // Alternative: direct user object or success message
      } else {
        console.error("Unexpected updateUser response format:", response.data);
        throw new Error("Failed to update user");
      }
    } catch (error) {
      console.error("Update user error:", error);
      throw error;
    }
  }
};

export default userService;