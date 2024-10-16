const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const socketIO = require("socket.io");
const cron = require("node-cron");
const connectDB = require("./config/db");
const redisClient = require("./helpers/redisClient");
const { findBestDriver } = require("./helpers/matchingAlgorithm");
//connect to database
dotenv.config();
connectDB();
//create express app
const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());
//routes
const userRoutes = require("./routes/userRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("Logistics Platform API");
});
//socket io implementation
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});
//socket io connection established
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  socket.on("joinBookingRoom", (bookingId) => {
    socket.join(`booking:${bookingId}`);
    console.log(`Socket ${socket.id} joined room: booking:${bookingId}`);
  });

  socket.on("locationUpdate", async (data) => {
    const { bookingId, lat, lng } = data;
    console.log(`Location update for Booking ${bookingId}: (${lat}, ${lng})`);

    try {
      await redisClient.setEx(
        `driver:${bookingId}:location`,
        3600,
        JSON.stringify({ lat, lng })
      );

      io.to(`booking:${bookingId}`).emit("locationUpdate", { lat, lng });
      console.log(`Emitting location update for booking:${bookingId}`, {
        lat,
        lng,
      });
    } catch (error) {
      console.error("Error storing location in Redis:", error);
    }
  });
  //booking status update
  socket.on("bookingStatusUpdate", (data) => {
    const { bookingId, status } = data;
    console.log(`Booking ${bookingId} status updated to: ${status}`);

    io.emit(`booking:${bookingId}:status`, { status });
    io.to(`booking:${bookingId}`).emit("bookingStatusUpdate", {
      bookingId,
      status,
    });
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

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
//notify nearby drivers
const notifyNearbyDrivers = async (booking) => {
  try {
    const { vehicleType, pickupLat, pickupLng } = booking;
    const bestDriver = await findBestDriver(vehicleType, pickupLat, pickupLng);

    if (bestDriver) {
      console.log(`Notifying driver ${bestDriver._id} of new booking.`);
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

console.log("Redis Client: ", redisClient);

module.exports = { app, redisClient };
