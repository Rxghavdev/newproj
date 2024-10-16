const User = require("../models/userModel");
const Vehicle = require("../models/vehicleModel");
const Booking = require("../models/bookingModel");
const calculatePrice = require("../helpers/priceCalculator");
const { io } = require("../app");
const { getDistance } = require("../helpers/distanceCalculator");
const { findBestDriver } = require("../helpers/matchingAlgorithm");
//createBooking
const createBooking = async (req, res) => {
  try {
    const {
      pickupLocation,
      pickupCoordinates,
      dropoffLocation,
      dropoffCoordinates,
      vehicleType,
      scheduledAt,
    } = req.body;

    console.log(req.body);

    const distance = await getDistance(pickupLocation, dropoffLocation);

    const currentBookings = await Booking.countDocuments({ status: "pending" });
    const price = calculatePrice(vehicleType, distance, currentBookings);

    const status = scheduledAt ? "scheduled" : "pending";

    const booking = new Booking({
      user: req.user._id,
      pickupLocation,
      dropoffLocation,
      pickupCoordinates: {
        coordinates: {
          lat: pickupCoordinates.coordinates.lat,
          lng: pickupCoordinates.coordinates.lng,
        },
      },
      dropoffCoordinates: {
        coordinates: {
          lat: dropoffCoordinates.coordinates.lat,
          lng: dropoffCoordinates.coordinates.lng,
        },
      },
      vehicleType,
      price,
      distance,
      status,
      scheduledAt,
    });

    await booking.save();
    if (status === "pending") {
      const nearbyDriver = await findBestDriver(vehicleType);
      if (nearbyDriver) {
        console.log(`Notifying driver ${nearbyDriver._id} of new booking`);
        io.emit(`booking:request:${nearbyDriver._id}`, {
          bookingId: booking._id,
          pickupLocation,
          dropoffLocation,
          price,
          vehicleType,
        });
      }
    }
    res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({
      message: "Error creating booking",
      error: error.message || error,
    });
  }
};
//controller for getUserBookings
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const bookings = await Booking.find({ user: userId })
      .populate("driver", "name email")
      .populate("vehicle", "license_plate model vehicleType")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "User bookings retrieved successfully",
      bookings,
    });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({
      message: "Error fetching user bookings",
      error: error.message || error,
    });
  }
};
const acceptBooking = async (req, res) => {
  try {
    const { bookingId, driverLat, driverLng } = req.body;

    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, status: "pending" },
      { driver: req.user._id, status: "accepted" },
      { new: true }
    ).populate("vehicle");

    if (!booking) {
      return res
        .status(400)
        .json({ message: "Booking is no longer available" });
    }
    const driver = await User.findById(req.user._id).populate("vehicle");
    if (driver.vehicle) {
      booking.vehicle = driver.vehicle._id;
      await booking.save();
    } else {
      console.error("Driver has no vehicle assigned.");
      return res
        .status(400)
        .json({ message: "Driver has no vehicle assigned." });
    }

    await User.findByIdAndUpdate(req.user._id, { availability: false });

    // Calculate distance to pickup location
    const distanceToPickup = await getDistance(
      `${driverLat},${driverLng}`,
      `${booking.pickupCoordinates.coordinates.lat},${booking.pickupCoordinates.coordinates.lng}`
    );
    const etaInMinutes = Math.round((distanceToPickup / 40) * 60);

    res.status(200).json({
      message: "Booking accepted successfully",
      booking,
      eta: etaInMinutes,
    });
  } catch (error) {
    console.error("Error accepting booking:", error);
    res.status(500).json({
      message: "Error accepting booking",
      error: error.message || error,
    });
  }
};
//controller for getPriceEstimate
const getPriceEstimate = async (req, res) => {
  try {
    const { distance, vehicleType } = req.query;

    if (!distance || !vehicleType) {
      return res.status(400).json({
        message: "Distance and vehicleType are required for price estimation",
      });
    }

    const basePrice = 50;
    const pricePerKm =
      vehicleType === "truck" ? 20 : vehicleType === "bike" ? 5 : 10;
    const estimatedPrice = basePrice + pricePerKm * distance;

    res.status(200).json({ estimatedPrice });
  } catch (error) {
    console.error("Error getting price estimate:", error);
    res.status(500).json({
      message: "Error getting price estimate",
      error: error.message || error,
    });
  }
};
//controller for updateJobStatus
const updateJobStatus = async (req, res) => {
  try {
    const { bookingId, status } = req.body;

    const validStatuses = [
      "pending",
      "accepted",
      "in_progress",
      "completed",
      "cancelled",
      "scheduled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.driver.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You can only update your own jobs" });
    }

    booking.status = status;
    if (status === "accepted" && !booking.vehicle) {
      const driver = await User.findById(req.user._id).populate("vehicles");
      if (driver.vehicles && driver.vehicles.length > 0) {
        booking.vehicle = driver.vehicles[0]._id;
      }
    }

    await booking.save();

    if (status === "completed") {
      const driver = await User.findById(booking.driver);
      driver.tripCount += 1;
      await driver.save();

      driver.availability = true;
      await driver.save();
    }

    res.status(200).json({ message: "Job status updated", booking });
  } catch (error) {
    console.error("Error updating job status:", error);
    res.status(500).json({
      message: "Error updating job status",
      error: error.message || error,
    });
  }
};

const rateDriver = async (req, res) => {
  try {
    const { bookingId, rating } = req.body;

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "completed") {
      return res
        .status(400)
        .json({ message: "Cannot rate an incomplete trip" });
    }

    if (booking.rating) {
      return res.status(400).json({ message: "This booking is already rated" });
    }

    booking.rating = rating;
    await booking.save();

    const driver = await User.findById(booking.driver);

    const driverCompletedBookings = await Booking.find({
      driver: booking.driver,
      status: "completed",
      rating: { $exists: true },
    });

    const totalRatings = driverCompletedBookings.reduce(
      (acc, curr) => acc + curr.rating,
      0
    );

    const avgRating =
      driverCompletedBookings.length > 0
        ? totalRatings / driverCompletedBookings.length
        : rating;

    driver.rating = avgRating;
    await driver.save();

    res.status(200).json({ message: "Driver rated successfully", rating });
  } catch (error) {
    console.error("Error rating driver:", error);
    res.status(500).json({
      message: "Error rating driver",
      error: error.message || error,
    });
  }
};
//controller for getPendingBookings
const getPendingBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: "pending" })
      .populate("user", "name email")
      .populate("vehicle", "license_plate model vehicleType")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Pending bookings retrieved successfully",
      bookings,
    });
  } catch (error) {
    console.error("Error fetching pending bookings:", error);
    res.status(500).json({
      message: "Error fetching pending bookings",
      error: error.message || error,
    });
  }
};

module.exports = {
  createBooking,
  acceptBooking,
  getPriceEstimate,
  updateJobStatus,
  rateDriver,
  getUserBookings,
  getPendingBookings,
};
