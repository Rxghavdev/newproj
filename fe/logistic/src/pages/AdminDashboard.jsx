import React, { useEffect, useState } from "react";
import * as api from "../services/api";
import { AiOutlineBarChart, AiOutlineUser, AiOutlineCheckCircle } from "react-icons/ai";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBookings, setShowBookings] = useState(false);

  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(booking => booking.status === "completed").length;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const bookingsRes = await api.getAllBookings();
        const driversRes = await api.getAllDrivers();

        setBookings(bookingsRes.data);
        setDrivers(driversRes.data);
      } catch (error) {
        console.error("Error fetching admin data:", error);
        setError("Failed to fetch. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p className="text-xl">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-8 text-white">
      <h2 className="text-4xl font-bold text-center mb-8">Admin Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <AnalyticsCard
          title="Total Bookings"
          value={totalBookings}
          icon={<AiOutlineBarChart size={40} />}
        />
        <AnalyticsCard
          title="Completed Bookings"
          value={completedBookings}
          icon={<AiOutlineCheckCircle size={40} />}
        />
        <AnalyticsCard
          title="Registered Drivers"
          value={drivers.length}
          icon={<AiOutlineUser size={40} />}
        />
      </div>

      <div className="flex justify-center mb-8">
        <button
          className="bg-blue-600 px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          onClick={() => setShowBookings(!showBookings)}
        >
          {showBookings ? "Hide All Bookings" : "View All Bookings"}
        </button>
      </div>

      {showBookings && (
        <Section title="All Bookings" className="mt-8">
          {bookings.length > 0 ? (
            <ul className="space-y-4">
              {bookings.map((booking) => (
                <li
                  key={booking._id}
                  className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700 transition"
                >
                  <p><strong>Pickup:</strong> {booking.pickupLocation}</p>
                  <p><strong>Dropoff:</strong> {booking.dropoffLocation}</p>
                  <p><strong>Status:</strong> {booking.status}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center">No bookings available.</p>
          )}
        </Section>
      )}

      <Section title="All Drivers" className="mt-10">
        {drivers.length > 0 ? (
          <ul className="space-y-4">
            {drivers.map((driver) => (
              <li
                key={driver._id}
                className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700 transition"
              >
                <p><strong>Name:</strong> {driver.name}</p>
                <p><strong>Email:</strong> {driver.email}</p>
                <p><strong>Vehicle:</strong> {driver.vehicle}</p>
                <button
                  className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  onClick={() => handleViewPerformance(driver._id)}
                >
                  View Performance
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center">No drivers registered.</p>
        )}
      </Section>
    </div>
  );

  async function handleViewPerformance(driverId) {
    try {
      const response = await api.getDriverPerformance(driverId);
      alert(`Driver Performance: ${JSON.stringify(response.data)}`);
    } catch (error) {
      console.error("Error fetching driver performance:", error);
      alert("Failed to fetch driver performance.");
    }
  }
}

const AnalyticsCard = ({ title, value, icon }) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-md flex items-center">
    <div className="p-4 bg-blue-600 rounded-full mr-4">{icon}</div>
    <div>
      <h3 className="text-xl font-medium">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  </div>
);
const Section = ({ title, children, className = "" }) => (
  <div className={className}>
    <h3 className="text-2xl font-semibold mb-4">{title}</h3>
    {children}
  </div>
);
