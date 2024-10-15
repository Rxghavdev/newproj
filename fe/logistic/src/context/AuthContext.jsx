// src/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../services/api";
import { jwtDecode } from "jwt-decode";
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      const decoded = jwtDecode(token); 

      if (decoded.exp * 1000 < Date.now()) {
        logout(); // Logout if token is expired
      } else {
        api.setAuthToken(token);
        setUser(decoded.user); 
      }
    } else {
      api.setAuthToken(null); 
    }
  }, [token]);

  
  const login = async (credentials) => {
    try {
      const { data } = await api.login(credentials); // Login API call
      setUser(data); 
      setToken(data.token); 
      localStorage.setItem("token", data.token); 
      api.setAuthToken(data.token); 

      // Redirect based on role
      switch (data.role) {
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
    }
  };

  const register = async (data) => {
    try {
      await api.register(data);
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
    api.setAuthToken(null);
    navigate("/login"); 
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
