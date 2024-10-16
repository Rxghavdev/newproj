
//test
const io = require('socket.io-client');
const socket = io('http://localhost:5000'); 

const driverId = 'driver123'; 

socket.on(`tracking:${driverId}`, (data) => {
  console.log(`Received location update: (${data.lat}, ${data.lng})`);
});
