const getSurgeMultiplier = (currentBookings) => {
  if (currentBookings > 50) return 1.5;
  if (currentBookings > 20) return 1.3; //calculating for current demand
  return 1; // No surge
};
const calculatePrice = (vehicleType, distance, currentBookings) => {
  const basePrice = 50; // Base price for all bookings
  let pricePerKm;
  switch (vehicleType) {
    case "truck":
      pricePerKm = 20;
      break;
    case "car":
      pricePerKm = 10;
      break;
    case "bike":
      pricePerKm = 5;
      break;
    default:
      throw new Error("Invalid vehicle type");
  }
  const surgeMultiplier = getSurgeMultiplier(currentBookings);
  return (basePrice + pricePerKm * distance) * surgeMultiplier;
};

module.exports = calculatePrice;
