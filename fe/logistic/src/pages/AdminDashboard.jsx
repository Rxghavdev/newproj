import React, { useEffect, useState } from "react";
import * as api from "../services/api";
import {
  AiOutlineBarChart,
  AiOutlineUser,
  AiOutlineCar,
  AiOutlineCheckCircle,
  AiOutlineStar,
} from "react-icons/ai";
import { FiRefreshCw } from "react-icons/fi";
import Modal from "./Modal";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBookings, setShowBookings] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [modalTitle, setModalTitle] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [totalBookings, setTotalBookings] = useState(0);
  const [completedBookings, setCompletedBookings] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsRes, driversRes, vehiclesRes, analyticsRes] =
          await Promise.all([
            api.getAllBookings(),
            api.getAllDrivers(),
            api.getAllVehicles(),
            api.getAnalytics(),
          ]);

        setBookings(bookingsRes.data);
        setDrivers(driversRes.data);
        setVehicles(vehiclesRes.data);
        setAnalytics(analyticsRes.data);

        // Compute totalBookings and completedBookings
        setTotalBookings(bookingsRes.data.length);
        setCompletedBookings(
          bookingsRes.data.filter((b) => b.status === "completed").length
        );
      } catch (error) {
        console.error("Error fetching admin data:", error);
        setError("Failed to fetch data. Please try again.");
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
        <AnalyticsCard
          title="Total Vehicles"
          value={vehicles.length}
          icon={<AiOutlineCar size={40} />}
        />
      </div>
      <div className="flex justify-center mb-8">
        <button
          className="bg-blue-600 px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center text-white"
          onClick={() => setShowBookings(!showBookings)}
        >
          <FiRefreshCw size={20} className="mr-2" />
          {showBookings ? "Hide All Bookings" : "View All Bookings"}
        </button>
      </div>

      {/* Bookings Section */}
      {showBookings && (
        <Section title="All Bookings">
          {bookings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bookings.map((booking) => (
                <BookingCard key={booking._id} booking={booking} />
              ))}
            </div>
          ) : (
            <p className="text-center">No bookings available.</p>
          )}
        </Section>
      )}

      <Section title="All Drivers">
        {drivers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {drivers.map((driver) => (
              <DriverCard
                key={driver._id}
                driver={driver}
                onViewPerformance={handleViewPerformance}
              />
            ))}
          </div>
        ) : (
          <p className="text-center">No drivers registered.</p>
        )}
      </Section>

      <Section title="All Vehicles">
        {vehicles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle._id}
                vehicle={vehicle}
                onViewDetails={handleViewVehicleDetails}
              />
            ))}
          </div>
        ) : (
          <p className="text-center">No vehicles registered.</p>
        )}
      </Section>

      {isModalOpen && (
        <Modal title={modalTitle} onClose={() => setIsModalOpen(false)}>
          {modalContent}
        </Modal>
      )}
    </div>
  );

  async function handleViewPerformance(driverId) {
    try {
      const response = await api.getDriverPerformance(driverId);
      setModalTitle("Driver Performance");
      setModalContent(
        <div className="space-y-2">
          <p>
            <strong>License Status:</strong>{" "}
            {response.data.licenseStatus || "N/A"}
          </p>
          <p>
            <strong>Total Rides:</strong> {response.data.totalRides || 0}
          </p>
          <p>
            <strong>Completed Rides:</strong>{" "}
            {response.data.completedRides || 0}
          </p>
          <p>
            <strong>Trip Count:</strong> {response.data.tripCount || 0}
          </p>
          <p>
            <strong>Rating:</strong>{" "}
            {response.data.rating ? response.data.rating.toFixed(2) : "N/A"}
          </p>
        </div>
      );
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching driver performance:", error);
      alert("Failed to fetch driver performance.");
    }
  }

  async function handleViewVehicleDetails(vehicleId) {
    try {
      const response = await api.getVehicle(vehicleId);
      setModalTitle("Vehicle Details");
      setModalContent(
        <div className="space-y-2">
          <p>
            <strong>Model:</strong> {response.data.model || "N/A"}
          </p>
          <p>
            <strong>License Plate:</strong>{" "}
            {response.data.license_plate || "N/A"}
          </p>
        </div>
      );
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching vehicle details:", error);
      alert("Failed to fetch vehicle details.");
    }
  }
}

const AnalyticsCard = ({ title, value, icon }) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-md flex items-center">
    <div className="p-4 bg-blue-600 rounded-full mr-4 text-white">{icon}</div>
    <div>
      <h3 className="text-xl font-medium">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div className="mt-10">
    <h3 className="text-2xl font-semibold mb-4">{title}</h3>
    {children}
  </div>
);

const BookingCard = ({ booking }) => (
  <div className="bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition">
    <p>
      <strong>Pickup:</strong> {booking.pickupLocation}
    </p>
    <p>
      <strong>Dropoff:</strong> {booking.dropoffLocation}
    </p>
    <p>
      <strong>Status:</strong> {booking.status}
    </p>
    <p>
      <strong>Fare:</strong> ₹{booking.price || booking.fare}
    </p>
    <p>
      <strong>Driver:</strong>{" "}
      {booking.driver ? booking.driver._id : "not available"}
    </p>
  </div>
);

const DriverCard = ({ driver, onViewPerformance }) => (
  <div className="bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition">
    <p>
      <strong>Name:</strong> {driver.name}
    </p>
    <p>
      <strong>Email:</strong> {driver.email}
    </p>
    <button
      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
      onClick={() => onViewPerformance(driver._id)}
    >
      View Performance
    </button>
  </div>
);

const VehicleCard = ({ vehicle, onViewDetails }) => (
  <div className="bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition">
    <p>
      <strong>Model:</strong> {vehicle.model || "N/A"}
    </p>
    <p>
      <strong>License Plate:</strong> {vehicle.license_plate || "N/A"}
    </p>
    
    <button
      className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
      onClick={() => onViewDetails(vehicle._id)}
    >
      View Details
    </button>
  </div>
);
