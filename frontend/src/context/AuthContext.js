import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in on component mount
    checkUserLoggedIn();

    // Setup timer to check token expiration
    const interval = setInterval(() => {
      const expiryTime = localStorage.getItem('token_expiry');
      if (expiryTime && new Date() >= new Date(expiryTime)) {
        logout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const checkUserLoggedIn = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        const userData = await authService.getProfile();
        if (userData) {
          setCurrentUser(userData);
          localStorage.setItem("user_role", userData.role);
        }
      }
    } catch (err) {
      console.error("Error checking authentication:", err);
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_role");
    } finally {
      setLoading(false);
    }
  };

  // Updated login method in AuthContext.js
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      console.log("Login response in context:", response);

      // Check if response contains token
      if (response && response.token) {
        localStorage.setItem("auth_token", response.token);
        
        // Set token expiration (24 hours from now)
        const expiryTime = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
        localStorage.setItem("token_expiry", expiryTime.toISOString());
        setTokenExpiry(expiryTime);

        // Set user data from response
        if (response.user) {
          setCurrentUser(response.user);
          localStorage.setItem("user_role", response.user.role);
        }

        navigate("/");
        return response;
      } else {
        throw new Error("Invalid response from server: missing token");
      }
    } catch (err) {
      console.error("Login error in context:", err);
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your credentials.",
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.register(userData);
      localStorage.setItem("auth_token", response.token);
      
      // Set token expiration (24 hours from now)
      const expiryTime = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
      localStorage.setItem("token_expiry", expiryTime.toISOString());
      setTokenExpiry(expiryTime);
      
      setCurrentUser(response.user);
      localStorage.setItem("user_role", response.user.role);
      navigate("/");
      return response;
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("token_expiry");
    setCurrentUser(null);
    setTokenExpiry(null);
    navigate("/login");
  }, [navigate]);

  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    tokenExpiry,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
