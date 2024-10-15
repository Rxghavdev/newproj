const User = require("../models/userModel");
const Booking = require("../models/bookingModel");
const calculatePrice = require("../helpers/priceCalculator");
const { io } = require("../app"); // Import the Socket.IO instance from app.js
const { getDistance } = require("../helpers/distanceCalculator");
const { findBestDriver } = require("../helpers/matchingAlgorithm");

// const createBooking = async (req, res) => {
//   try {
//     const {
//       pickupLocation,
//       dropoffLocation,
//       vehicleType,
//       distance,
//       pickupLat,
//       pickupLng
//     } = req.body;

//     // Calculate price based on distance, vehicle type, and current bookings
//     const currentBookings = await Booking.countDocuments({ status: 'pending' });
//     const price = calculatePrice(vehicleType, distance, currentBookings);

//     // Create a new booking object
//     const booking = new Booking({
//       user: req.user._id,
//       pickupLocation,
//       dropoffLocation,
//       vehicleType,
//       price,
//       status: 'pending', // Default status
//     });

//     // Save the booking to the database
//     await booking.save();

//     // Notify the nearest available driver using `findBestDriver`
//     const nearbyDriver = await findBestDriver(vehicleType, pickupLat, pickupLng);

//     if (nearbyDriver) {
//       console.log(`Notifying driver ${nearbyDriver._id} of new booking`);
//       // Emit a notification to the specific driver using Socket.IO
//       io.emit(`booking:request:${nearbyDriver._id}`, {
//         bookingId: booking._id,
//         pickupLocation,
//         dropoffLocation,
//         price,
//         vehicleType,
//       });
//     }

//     // Respond with success message and booking details
//     res.status(201).json({
//       message: 'Booking created successfully',
//       booking,
//     });

//   } catch (error) {
//     console.error('Error creating booking:', error);
//     res.status(500).json({
//       message: 'Error creating booking',
//       error: error.message || error,
//     });
//   }
// };
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
      pickupCoordinates,
      dropoffCoordinates,
      vehicleType,
      price,
      distance,
      status,
      scheduledAt, // Optional scheduled time
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

const getUserBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const bookings = await Booking.find({ user: userId }).sort({
      createdAt: -1,
    });

    res
      .status(200)
      .json({ message: "User bookings retrieved successfully", bookings });
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
    );

    if (!booking) {
      return res
        .status(400)
        .json({ message: "Booking is no longer available" });
    }

    await User.findByIdAndUpdate(req.user._id, { availability: false });

    // Calculate ETA assuming a speed of 40 km/h
    const distanceToPickup = await getDistance(
      `${driverLat},${driverLng}`,
      booking.pickupLocation
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

const updateDriverLocation = async (req, res) => {
  try {
    const { driverId, lat, lng } = req.body;

    if (!driverId || !lat || !lng) {
      return res.status(400).json({ message: "Invalid request data." });
    }

    redisClient.setex(
      `driver:${driverId}:location`,
      3600, // Expiration time in seconds
      JSON.stringify({ lat, lng })
    );

    res.status(200).json({ message: "Driver location updated successfully." });
  } catch (error) {
    console.error("Error updating driver location:", error);
    res.status(500).json({
      message: "Failed to update driver location.",
      error: error.message,
    });
  }
};

const getPriceEstimate = async (req, res) => {
  try {
    const { distance, vehicleType } = req.query;
    const basePrice = 50;
    const pricePerKm = vehicleType === "truck" ? 20 : 10;
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

const updateJobStatus = async (req, res) => {
  try {
    const { bookingId, status } = req.body;
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
    await booking.save();
    if (status === "completed") {
      const driver = await User.findById(booking.driver);
      driver.tripCount += 1;
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
      (totalRatings + rating) / (driverCompletedBookings.length + 1);     //calculating rating

    driver.rating = avgRating;
    await driver.save();

    res.status(200).json({ message: "Driver rated successfully", rating });
  } catch (error) {
    console.error("Error rating driver:", error);
    res
      .status(500)
      .json({ message: "Error rating driver", error: error.message || error });
  }
};
const getPendingBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: "pending" })
      .populate("user", "name email") 
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ message: "Pending bookings retrieved successfully", bookings });
  } catch (error) {
    console.error("Error fetching pending bookings:", error);
    res.status(500).json({
      message: "Error fetching pending bookings",
      error: error.message || error,
    });
  }
};
const getDriverLocation = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await User.findById(driverId);
    if (!driver || !driver.location) {
      return res.status(404).json({ message: "Location not found." });
    }

    res.status(200).json({ location: driver.location });
  } catch (error) {
    console.error("Error fetching driver location:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch location.", error: error.message });
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
  updateDriverLocation,
  getDriverLocation,
};
