const User = require('../models/userModel');
const Booking = require('../models/bookingModel');

const getAllDrivers = async (req, res) => {
    try {
        const drivers = await User.find({ role: 'driver' });
        res.status(200).json(drivers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching drivers', error: error.message });
    }
};

const getDriverPerformance = async (req, res) => {
    try {
        const driver = await User.findById(req.params.id);

        if (!driver || driver.role !== 'driver') {
            return res.status(404).json({ message: 'Driver not found' });
        }

        const completedTrips = await Booking.countDocuments({ driver: driver._id, status: 'completed' });

        res.status(200).json({
            driver,
            completedTrips,
            rating: driver.rating,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching driver data', error: error.message });
    }
};

const getAnalytics = async (req, res) => {
    try {
        const totalTrips = await Booking.countDocuments({ status: 'completed' });

        const avgTripTime = await Booking.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, avgTime: { $avg: '$tripDuration' } } },
        ]);

        const driverPerformance = await User.aggregate([
            { $match: { role: 'driver' } },
            { $group: { _id: null, avgRating: { $avg: '$rating' } } },
        ]);

        res.status(200).json({
            totalTrips,
            avgTripTime: avgTripTime[0]?.avgTime || 0,
            avgDriverRating: driverPerformance[0]?.avgRating || 0,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching analytics', error: error.message });
    }
};

module.exports = {
    getAllDrivers,
    getDriverPerformance,
    getAnalytics,
};
