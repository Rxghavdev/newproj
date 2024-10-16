// src/pages/LoginPage.jsx

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const { login } = useAuth(); 
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState(""); 
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
        },
        (error) => setError("Unable to retrieve location.")
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); 

    if (!credentials.email || !credentials.password) {
      return setError("Both email and password are required.");
    }

    setLoading(true); 

    try {
      await login({ ...credentials, ...location });
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid credentials or login failed. Please try again.");
    } finally {
      setLoading(false); 
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center text-white">Login</h2>

                {error && (
          <div className="p-3 text-red-600 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className={`w-full py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition duration-300 ${
              loading ? "cursor-not-allowed opacity-50" : ""
            }`}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
