const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const protect = async (req, res, next) => {
  let token;

  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      return next(); 
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
  } catch (error) {
    console.error('Authorization error:', error);
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Access denied' });
    }
    next(); 
  };
};

module.exports = { protect, authorizeRoles };
