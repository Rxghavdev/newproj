const Redis = require('redis');
const Booking = require('../models/bookingModel');
const User = require('../models/userModel');
const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

//matching logic
const calculateProximity = (pickupLat, pickupLng, driverLat, driverLng) => {
  return Math.sqrt(
    Math.pow(driverLat - pickupLat, 2) + Math.pow(driverLng - pickupLng, 2)
  );
};

const findBestDriver = async (vehicleType, pickupLat, pickupLng) => {
  try {
    const drivers = await User.find({ 
      role: 'driver', 
      availability: true, 
      vehicle: vehicleType 
    });

    if (drivers.length === 0) {
      return null; 
    }

    let bestDriver = null;
    let bestProximity = Infinity;
    for (const driver of drivers) {
      const locationData = await redisClient.getAsync(`driver:${driver._id}:location`);
      if (!locationData) continue; // Skip if no location is found

      const { lat: driverLat, lng: driverLng } = JSON.parse(locationData);
      const proximity = calculateProximity(pickupLat, pickupLng, driverLat, driverLng);

      if (proximity < bestProximity) {
        bestProximity = proximity;
        bestDriver = driver;
      }
    }

    return bestDriver;
  } catch (error) {
    console.error('Error in matching algorithm:', error);
    throw new Error('Failed to find a suitable driver');
  }
};

module.exports = { findBestDriver };
