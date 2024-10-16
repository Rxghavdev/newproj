const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const redisClient = require("../helpers/redisClient");
const Vehicle = require("../models/vehicleModel");


// Register a new user 
const registerUser = async (req, res) => {
  const { name, email, password, role, vehicleType, license_plate, model } =
    req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const user = new User({
      name,
      email,
      password,
      role: role || "user",
    });

    if (role === "driver") {
      if (!vehicleType || !license_plate || !model) {
        return res.status(400).json({
          message:
            "Vehicle details (type, license plate, and model) are required for drivers",
        });
      }

      const vehicle = new Vehicle({
        owner: user._id,
        vehicleType,
        license_plate,
        model,
      });

      await vehicle.save();

      user.vehicle = vehicle._id;
    }

    await user.save();

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      vehicle: user.vehicle ? user.vehicle : null, // Include vehicle if available
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({
      message: "Error registering user",
      error: error.message || error,
    });
  }
};
// Login a user
const loginUser = async (req, res) => {
  const { email, password, lat, lng } = req.body;

  try {
    const user = await User.findOne({ email }).select("+password");

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      });
      await redisClient.setEx(
        `user:${user._id}:location`,
        3600,
        JSON.stringify({ lat, lng })
      );

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { registerUser, loginUser };
