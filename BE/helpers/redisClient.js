const { createClient } = require('redis');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const redisClient = createClient({
  password: process.env.REDIS_PASSWORD || '5rE5IRFytuBTd4KSpo9fe90O1SfchrN6',
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
  },
});

// Event listeners for Redis connection
redisClient.on('connect', () => console.log('Connected to Redis'));
redisClient.on('error', (err) => console.error('Redis error:', err));

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Error connecting to Redis:', err);
  }
})();

module.exports = redisClient;
