const express = require('express');
const router = express.Router();
const { register, login, checkEmail, getProfile, updateProfile, getAllUsers, toggleUserStatus, requestPasswordReset, resetPassword } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Too many authentication attempts. Please try again in a few minutes.',
});

// Public
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.get('/check-email', checkEmail);

// Password reset
router.post('/forgot-password', authRateLimiter, requestPasswordReset);
router.post('/reset-password', authRateLimiter, resetPassword);

// Protected (any role)
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// Admin only
router.get('/users', protect, adminOnly, getAllUsers);
router.put('/users/:id/toggle', protect, adminOnly, toggleUserStatus);

module.exports = router;
