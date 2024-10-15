const axios = require("axios");

//calculate distance between two locations
const getDistance = async (pickupLocation, dropoffLocation) => {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  console.log(pickupLocation);
  console.log(dropoffLocation);

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
    pickupLocation
  )}&destinations=${encodeURIComponent(
    dropoffLocation
  )}&key=${GOOGLE_MAPS_API_KEY}`;


  //fetching distance from Google Maps API
  try {
    const response = await axios.get(url);

    if (
      response.data &&
      response.data.rows &&
      response.data.rows.length > 0 &&
      response.data.rows[0].elements &&
      response.data.rows[0].elements.length > 0 &&
      response.data.rows[0].elements[0].status === "OK"
    ) {
      const distanceInMeters = response.data.rows[0].elements[0].distance.value;
      const distanceInKm = distanceInMeters / 1000; 
      return distanceInKm;
    } else {
      console.error("Invalid response from Google Maps API", response.data);
      throw new Error("Unable to calculate distance.");
    }
  } catch (error) {
    console.error("Error fetching distance:", error.message);
    throw new Error("Failed to fetch distance from Google Maps.");
  }
};

module.exports = { getDistance };
