const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
    getAllDrivers,
    getDriverPerformance,
    getAnalytics,
    getAllBookings
} = require('../controllers/adminController');

router.get('/drivers', protect, authorizeRoles('admin'), getAllDrivers);
router.get('/drivers/:id', protect, authorizeRoles('admin'), getDriverPerformance);
router.get('/analytics', protect, authorizeRoles('admin'), getAnalytics);
router.get('/bookings', protect, authorizeRoles('admin'), getAllBookings);


module.exports = router;
