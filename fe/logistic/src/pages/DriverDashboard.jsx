// src/pages/DriverDashboard.jsx

import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";

export default function DriverDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const { data } = await api.getAvailableBookings();
        setBookings(data);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };
    fetchBookings();
  }, []);

  const handleAccept = async (bookingId) => {
    try {
      await api.acceptBooking(bookingId);
      alert("Booking accepted!");
    } catch (error) {
      console.error("Error accepting booking:", error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl">Welcome, {user?.name}</h2>
      <h3 className="mt-4">Available Bookings:</h3>
      <ul className="space-y-4">
        {bookings.map((booking) => (
          <li key={booking._id} className="border p-4 rounded">
            <p>Pickup: {booking.pickupLocation}</p>
            <p>Dropoff: {booking.dropoffLocation}</p>
            <button
              onClick={() => handleAccept(booking._id)}
              className="bg-green-600 text-white rounded p-2 mt-2"
            >
              Accept Booking
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
