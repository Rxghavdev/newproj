const io = require('socket.io-client');
const socket = io('http://localhost:5000'); // Replace with your backend address

const driverId = 'driver123'; // Example driver ID

// Simulate GPS updates every 5 seconds
setInterval(() => {
  const lat = (Math.random() * (12.9800 - 12.9700) + 12.9700).toFixed(6);
  const lng = (Math.random() * (77.6000 - 77.5900) + 77.5900).toFixed(6);

  console.log(`Sending location: (${lat}, ${lng})`);

  socket.emit('locationUpdate', { driverId, lat: parseFloat(lat), lng: parseFloat(lng) });
}, 5000);
