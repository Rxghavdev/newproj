const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  createBooking,
  acceptBooking,
  getPriceEstimate,
  updateJobStatus,
  rateDriver,
  getUserBookings,
} = require('../controllers/bookingController');

router.post('/create', protect, authorizeRoles('user'), createBooking);
router.post('/accept', protect, authorizeRoles('driver'), acceptBooking);
router.get('/price', protect, authorizeRoles('user'), getPriceEstimate);
router.put('/status', protect, authorizeRoles('driver'), updateJobStatus);
router.post('/rate', protect, authorizeRoles('user'), rateDriver);
router.get('/my-bookings', protect, authorizeRoles('user'), getUserBookings);

module.exports = router;
