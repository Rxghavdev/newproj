// src/context/AuthContext.jsx

import { createContext, useContext, useState } from "react";
import { Route, useNavigate } from "react-router-dom";
import * as api from "../services/api";

import UserDashboard from "../pages/UserDashboard";
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const login = async (credentials) => {
    try {
      const { data } = await api.login(credentials); // Await the login API call
      setUser(data);
      
      // Redirect to dashboard on success
      alert("Login successful!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      alert("Invalid email or password"); // Show error message to user
    }
  };

  const register = async (data) => {
    try {
      await api.register(data);
      navigate("/login"); // Redirect to login page on successful registration
      alert("Registration successful!");
    } catch (error) {
      console.error("Registration failed:", error);
      alert("Registration failed! Please try again.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register }}>
      {children}
    </AuthContext.Provider>
  );
};
