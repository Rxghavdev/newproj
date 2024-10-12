// src/pages/UserDashboard.jsx

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";

export default function UserDashboard() {
  const { user } = useAuth();
  const [bookingDetails, setBookingDetails] = useState({
    pickupLocation: "",
    dropoffLocation: "",
    vehicleType: "car",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBookingDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    try {
      await api.createBooking(bookingDetails);
      alert("Booking created successfully!");
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Failed to create booking.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-lg p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Welcome, {user?.name}
        </h1>
        <form onSubmit={handleBooking} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pickup Location
            </label>
            <input
              type="text"
              name="pickupLocation"
              placeholder="Enter pickup location"
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Dropoff Location
            </label>
            <input
              type="text"
              name="dropoffLocation"
              placeholder="Enter dropoff location"
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Vehicle Type
            </label>
            <select
              name="vehicleType"
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="car">Car</option>
              <option value="truck">Truck</option>
              <option value="bike">Bike</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition duration-300"
          >
            Create Booking
          </button>
        </form>
      </div>
    </div>
  );
}
