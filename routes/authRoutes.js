const express = require('express');
const router = express.Router();
const { register, login, checkEmail, getProfile, updateProfile, getAllUsers, toggleUserStatus, requestPasswordReset, resetPassword } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');
const User = require('../models/User');

const buildEmailScopedKey = (req, ip) => {
  const rawEmail = typeof req.body?.email === 'string' ? req.body.email : '';
  const normalizedEmail = rawEmail.trim().toLowerCase();
  return `${ip}:${req.baseUrl}:${req.path}:${normalizedEmail || 'anonymous'}`;
};

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Too many authentication attempts. Please try again in a few minutes.',
});

const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Too many authentication attempts for this account.',
  keyBuilder: buildEmailScopedKey,
  skip: (req) => req.skipLoginRateLimit === true,
  skipSuccessfulRequests: true,
});

const passwordResetRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message: 'Too many password reset attempts for this account.',
  keyBuilder: buildEmailScopedKey,
});

const skipLoginRateLimitForUnknownAccounts = async (req, res, next) => {
  try {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email : '';
    const normalizedEmail = rawEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      return next();
    }

    const existingUser = await User.findOne({ email: normalizedEmail }).select('_id');
    if (!existingUser) {
      req.skipLoginRateLimit = true;
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

// Public
router.post('/register', authRateLimiter, register);
router.post('/login', skipLoginRateLimitForUnknownAccounts, loginRateLimiter, login);
router.get('/check-email', checkEmail);

// Password reset
router.post('/forgot-password', passwordResetRateLimiter, requestPasswordReset);
router.post('/reset-password', authRateLimiter, resetPassword);

// Protected (any role)
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// Admin only
router.get('/users', protect, adminOnly, getAllUsers);
router.put('/users/:id/toggle', protect, adminOnly, toggleUserStatus);

module.exports = router;
