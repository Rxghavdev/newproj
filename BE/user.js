const io = require('socket.io-client');
const socket = io('http://localhost:5000'); // Replace with your backend address

const driverId = 'driver123'; // Same driver ID used in the simulation

// Listen for location updates for the driver
socket.on(`tracking:${driverId}`, (data) => {
  console.log(`Received location update: (${data.lat}, ${data.lng})`);
});
