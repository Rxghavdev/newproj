// src/context/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../services/api";
import { jwtDecode } from "jwt-decode"; // Incorrect import

const AuthContext = createContext();

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  // Initialize user and token from localStorage
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem("token") || null);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token); // Decode the token
        console.log("Decoded Token:", decoded);
    
        if (decoded.exp * 1000 < Date.now()) {
          logout(); // Logout if token is expired
        } else {
          api.setAuthToken(token);
          // User is already set from login function
        }
      } catch (error) {
        console.error("Token decoding failed:", error);
        logout(); // Logout if token is invalid
      }
    }
  }, [token]);

  const login = async (credentials) => {
    try {
      console.log("Login Credentials:", credentials)
      const { data } = await api.login(credentials); // Login API call
      console.log("Login Data:", data);

      const { token, ...userData } = data; // Destructure token and user data
      setUser(userData);
      setToken(token);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      api.setAuthToken(token);

      // Redirect based on role
      switch (userData.role) {
        case "user":
          navigate("/user-dashboard");
          break;
        case "admin":
          navigate("/admin-dashboard");
          break;
        case "driver":
          navigate("/driver-dashboard");
          break;
        default:
          navigate("/login");
          break;
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Invalid email or password");
      throw error; // Re-throw to handle in LoginPage if needed
    }
  };

  const register = async (registrationData) => {
    try {
      await api.register(registrationData);
      alert("Registration successful!");
      navigate("/login");
    } catch (error) {
      console.error("Registration failed:", error);
      alert("Registration failed! Please try again.");
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    api.setAuthToken(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
