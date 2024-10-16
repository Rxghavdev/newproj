import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../services/api";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  });

  const [token, setToken] = useState(
    () => localStorage.getItem("token") || null
  );

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token); // Decode the token
        console.log("Decoded Token:", decoded);

        console.log(decoded);

        console.log(
          "Token Expiry:",
          new Date(decoded.exp * 1000).toLocaleString()
        );
        console.log(Date.now().toLocaleString());

        if (decoded.exp * 1000 < Date.now()) {
          console.log("logging out");
          logout(); // Logout if token is expired
        } else {
          api.setAuthToken(token);
        }
      } catch (error) {
        console.error("Token decoding failed:", error);
        logout();
      }
    } else {
      navigate("/login");
    }
  }, [token]);

  const login = async (credentials) => {
    try {
      const { data } = await api.login(credentials); // Login API call

      const { token, ...userData } = data;
      setUser(userData);
      setToken(token);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      api.setAuthToken(token);

      console.log(userData.role);

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
          console.log("test");
          navigate("/login");
          break;
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Invalid email or password");
      throw error;
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
