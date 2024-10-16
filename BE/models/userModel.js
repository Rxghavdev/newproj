const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'driver', 'admin'], // User roles
      default: 'user',
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      validate: {
        validator: function () {
          return this.role === 'driver';
        },
        message: 'Vehicle is required for drivers',
      },
    
    },
    availability: {
      type: Boolean,
      default: true,
    },
    licenseStatus: {
      type: String,
      enum: ['valid', 'expired', 'pending'], // Driver license status
      default: 'valid',
    },
    rating: {
      type: Number, 
      default: 5.0,
    },
    tripCount: {
      type: Number, 
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
