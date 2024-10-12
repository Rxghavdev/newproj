const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const socketIO = require("socket.io");
const Redis = require("redis");
const cron = require("node-cron");
const connectDB = require("./config/db");
const { findBestDriver } = require("./helpers/matchingAlgorithm");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000", // Allow frontend origin
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Allow cookies and credentials
  })
);

app.use(express.json()); // Ensure body parsing happens after CORS

const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Redis client configuration
const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
});

redisClient.on("connect", () => console.log("Connected to Redis"));
redisClient.on("error", (err) => console.error("Redis error:", err));

// Import routes
const userRoutes = require("./routes/userRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Apply routes
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("Logistics Platform API");
});

io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);
  
  socket.on("locationUpdate", (data) => {
    const { driverId, lat, lng } = data;
    console.log(`Location update from Driver ${driverId}: (${lat}, ${lng})`);

    redisClient.setex(
      `driver:${driverId}:location`,
      3600,
      JSON.stringify({ lat, lng })
    );

    io.emit(`tracking:${driverId}`, { lat, lng });
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Cron job to activate scheduled bookings
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();
    const Booking = require("./models/bookingModel");
    const bookings = await Booking.find({
      status: "scheduled",
      scheduledAt: { $lte: now },
    });

    for (const booking of bookings) {
      booking.status = "pending";
      await booking.save();
      console.log(`Activated scheduled booking: ${booking._id}`);
      notifyNearbyDrivers(booking);
    }
  } catch (error) {
    console.error("Error activating scheduled bookings:", error);
  }
});

const notifyNearbyDrivers = async (booking) => {
  try {
    const { vehicleType, pickupLat, pickupLng } = booking;
    const bestDriver = await findBestDriver(vehicleType, pickupLat, pickupLng);

    if (bestDriver) {
      console.log(`Notifying driver ${bestDriver._id} of new booking.`);
      io.emit(`booking:request:${bestDriver._id}`, { bookingId: booking._id });
    } else {
      console.log("No available driver found.");
    }
  } catch (error) {
    console.error("Error notifying drivers:", error);
  }
};

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "An error occurred!", error: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
