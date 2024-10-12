const User = require("../models/userModel");
const Booking = require("../models/bookingModel");
const calculatePrice = require("../helpers/priceCalculator");

const createBooking = async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, vehicleType, distance } = req.body;
    const currentBookings = await Booking.countDocuments({ status: "pending" });
    const price = calculatePrice(vehicleType, distance, currentBookings);

    const booking = new Booking({
      user: req.user._id,
      pickupLocation,
      dropoffLocation,
      vehicleType,
      price,
      status: "pending",
    });

    await booking.save();
    res.status(201).json({ message: "Booking created successfully", booking });
  } catch (error) {
    console.error("Error creating booking:", error);
    res
      .status(500)
      .json({
        message: "Error creating booking",
        error: error.message || error,
      });
  }
};

const acceptBooking = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.driver) {
      return res.status(400).json({ message: "Booking already accepted" });
    }

    booking.driver = req.user._id;
    booking.status = "accepted";

    await booking.save();
    res.status(200).json({ message: "Booking accepted", booking });
  } catch (error) {
    console.error("Error accepting booking:", error);
    res
      .status(500)
      .json({
        message: "Error accepting booking",
        error: error.message || error,
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
    res
      .status(500)
      .json({
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

    // Incrementing driver's trip count if the status is 'completed'
    if (status === "completed") {
      const driver = await User.findById(booking.driver);
      driver.tripCount += 1;
      await driver.save();
    }

    res.status(200).json({ message: "Job status updated", booking });
  } catch (error) {
    console.error("Error updating job status:", error);
    res
      .status(500)
      .json({
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
      (totalRatings + rating) / (driverCompletedBookings.length + 1);

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

module.exports = {
  createBooking,
  acceptBooking,
  getPriceEstimate,
  updateJobStatus,
  rateDriver,
};
