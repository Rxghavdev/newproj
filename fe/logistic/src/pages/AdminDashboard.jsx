// src/pages/AdminDashboard.jsx

import React, { useEffect, useState } from "react";
import * as api from "../services/api";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [analytics, setAnalytics] = useState({});

  // Fetch bookings, users, and analytics data on page load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const bookingsRes = await api.getAllBookings();
        const usersRes = await api.getAllUsers();
        const driversRes = await api.getAllDrivers();
        const analyticsRes = await api.getAnalytics();

        setBookings(bookingsRes.data);
        setUsers(usersRes.data);
        setDrivers(driversRes.data);
        setAnalytics(analyticsRes.data);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>

      <div className="mt-4">
        <h3 className="text-xl">Analytics</h3>
        <p>Total Bookings: {analytics.totalBookings}</p>
        <p>Completed Bookings: {analytics.completedBookings}</p>
        <p>Registered Users: {analytics.totalUsers}</p>
      </div>

      <div className="mt-6">
        <h3 className="text-xl">All Bookings</h3>
        <ul className="space-y-4">
          {bookings.map((booking) => (
            <li key={booking._id} className="border p-4 rounded">
              <p>Pickup: {booking.pickupLocation}</p>
              <p>Dropoff: {booking.dropoffLocation}</p>
              <p>Status: {booking.status}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <h3 className="text-xl">Drivers</h3>
        <ul className="space-y-4">
          {drivers.map((driver) => (
            <li key={driver._id} className="border p-4 rounded">
              <p>Name: {driver.name}</p>
              <p>Email: {driver.email}</p>
              <p>Vehicle: {driver.vehicle}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <h3 className="text-xl">Users</h3>
        <ul className="space-y-4">
          {users.map((user) => (
            <li key={user._id} className="border p-4 rounded">
              <p>Name: {user.name}</p>
              <p>Email: {user.email}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
