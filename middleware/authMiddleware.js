const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect: verify JWT token
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Account is inactive or not found' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied for this account role' });
  }
  return next();
};

const adminOnly = authorize('admin');
const hallOwnerOnly = authorize('hall_owner');
const userOnly = authorize('user');
const adminOrOwner = authorize('admin', 'hall_owner');
const bookingUser = authorize('user', 'hall_owner', 'admin');

module.exports = { protect, authorize, adminOnly, hallOwnerOnly, userOnly, adminOrOwner, bookingUser };
