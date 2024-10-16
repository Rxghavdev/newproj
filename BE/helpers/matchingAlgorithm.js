const redis = require('redis');
const User = require('../models/userModel');

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
  await redisClient.connect();
})();

// Matching logic
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
    }).populate('vehicle'); // Populate the 'vehicle' field

    const matchedDrivers = drivers.filter(driver => {
      return driver.vehicle && driver.vehicle.vehicleType === vehicleType;
    });

    if (matchedDrivers.length === 0) {
      return null; 
    }

    let bestDriver = null;
    let bestProximity = Infinity;

    for (const driver of matchedDrivers) {
      const locationData = await redisClient.get(`driver:${driver._id}:location`);
      if (!locationData) continue; 

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
