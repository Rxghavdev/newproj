const User = require("../models/userModel");
const Booking = require("../models/bookingModel");
const Vehicle = require("../models/vehicleModel");

const getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.status(200).json(vehicles);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching vehicles", error: error.message });
  }
};

const getVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    res.status(200).json(vehicle);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching vehicle", error: error.message });
  }
};

const getAllDrivers = async (req, res) => {
  try {
    const drivers = await User.find({ role: "driver" });
    res.status(200).json(drivers);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching drivers", error: error.message });
  }
};
const getDriverPerformance = async (req, res) => {
  try {
    const driverId = req.params.id;

    const driver = await User.findById(driverId);

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    const totalRides = await Booking.countDocuments({ driver: driverId });
    const completedRides = await Booking.countDocuments({
      driver: driverId,
      status: "completed",
    });

    res.json({
      totalRides,
      completedRides,
      rating: driver.rating || 0,
      tripCount: driver.tripCount || 0,
      licenseStatus: driver.licenseStatus || "Unknown",
    });
  } catch (error) {
    console.error("Error fetching driver performance:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const totalTrips = await Booking.countDocuments({ status: "completed" });

    const avgTripTime = await Booking.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, avgTime: { $avg: "$tripDuration" } } },
    ]);

    const driverPerformance = await User.aggregate([
      { $match: { role: "driver" } },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);

    res.status(200).json({
      totalTrips,
      avgTripTime: avgTripTime[0]?.avgTime || 0,
      avgDriverRating: driverPerformance[0]?.avgRating || 0,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching analytics", error: error.message });
  }
};
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.status(200).json(bookings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching bookings", error: error.message });
  }
};

module.exports = {
  getAllVehicles,
  getVehicle,
  getAllDrivers,
  getDriverPerformance,
  getAnalytics,
  getAllBookings,
};
