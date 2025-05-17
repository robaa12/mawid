import api from "./api";

const authService = {
  // Login user and get token
  login: async (credentials) => {
    try {
      const response = await api.post("/auth/login", credentials);
      console.log("Login response:", response);

      // Check the response structure
      // In Go API, should be: { success: true, message: "Login successful", data: { token: "...", user: {...} } }
      if (response.data && response.data.success && response.data.data) {
        return response.data.data; // Return the data object with token and user
      } else if (response.data && response.data.token) {
        // Alternative response structure
        return response.data;
      } else {
        // Unexpected response format
        console.error("Unexpected login response format:", response.data);
        throw new Error("Unexpected response format from server");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  // Register new user
  register: async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      console.log("Register response:", response);

      // Check the response structure similar to login
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      } else if (response.data && response.data.token) {
        return response.data;
      } else {
        console.error("Unexpected register response format:", response.data);
        throw new Error("Unexpected response format from server");
      }
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get("/auth/profile");
      console.log("Profile response:", response);

      // Check the response structure
      if (response.data && response.data.success && response.data.data) {
        return response.data.data; // Return user data
      } else if (response.data) {
        return response.data; // Alternative: direct user object
      } else {
        console.error("Unexpected profile response format:", response.data);
        throw new Error("Failed to get profile");
      }
    } catch (error) {
      console.error("Get profile error:", error);
      throw error;
    }
  },
};

export default authService;
