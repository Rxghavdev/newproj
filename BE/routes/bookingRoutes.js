const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  createBooking,
  acceptBooking,
  getPriceEstimate,
  updateJobStatus,
  rateDriver,
  getUserBookings,
  getPendingBookings,
  updateDriverLocation,
} = require("../controllers/bookingController");
const { redisClient } = require('../app');


//all the routes for booking
router.post("/create", protect, authorizeRoles("user"), createBooking);
router.get("/pending", protect, authorizeRoles("driver"), getPendingBookings);
router.post("/accept", protect, authorizeRoles("driver"), acceptBooking);
router.get("/price", protect, authorizeRoles("user"), getPriceEstimate);
router.put("/status", protect, authorizeRoles("driver"), updateJobStatus);
router.post("/rate", protect, authorizeRoles("user"), rateDriver);
router.get("/my-bookings", protect, authorizeRoles("user"), getUserBookings);


console.log("redisClient:", redisClient);


module.exports = router;
