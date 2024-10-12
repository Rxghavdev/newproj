const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
    getAllDrivers,
    getDriverPerformance,
    getAnalytics,
} = require('../controllers/adminController');

router.get('/drivers', protect, authorizeRoles('admin'), getAllDrivers);
router.get('/drivers/:id', protect, authorizeRoles('admin'), getDriverPerformance);
router.get('/analytics', protect, authorizeRoles('admin'), getAnalytics);

module.exports = router;
