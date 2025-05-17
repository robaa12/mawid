// Updated api.js - Focus on interceptors
import axios from "axios";

// Use environment variable with fallback
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api/v1";

// Log the API URL being used
console.log("Using API URL:", API_URL);

// Create an Axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // Add timeout of 10 seconds
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Don't override Content-Type for FormData requests
    if (config.data instanceof FormData) {
      // Don't set Content-Type as axios will set it correctly with boundary
      delete config.headers["Content-Type"];
    }

    // Log request details for debugging
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, {
      data: config.data,
      params: config.params,
      headers: config.headers,
    });

    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(
      `API Response: ${response.config.method.toUpperCase()} ${response.config.url}`,
      {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      },
    );
    return response;
  },
  (error) => {
    console.error("API Response Error:", error);

    // Log more details about the error
    if (error.response) {
      console.error("Error Details:", {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method,
      });
    }

    // Handle expired token or unauthorized access
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_role");
      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
