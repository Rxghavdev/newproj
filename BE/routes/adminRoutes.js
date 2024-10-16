const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
    getAllVehicles,
    getVehicle,
    getAllDrivers,
    getDriverPerformance,
    getAnalytics,
    getAllBookings
} = require('../controllers/adminController');

router.get('/drivers', protect, authorizeRoles('admin'), getAllDrivers);
router.get('/drivers/:id', protect, authorizeRoles('admin'), getDriverPerformance);
router.get('/analytics', protect, authorizeRoles('admin'), getAnalytics);
router.get('/bookings', protect, authorizeRoles('admin'), getAllBookings);
router.get('/vehicles', protect, authorizeRoles('admin'), getAllVehicles);
router.get('/vehicles/:id', protect, authorizeRoles('admin'), getVehicle);


module.exports = router;
