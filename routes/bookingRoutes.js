const express = require('express');
const router = express.Router();
const { createBooking, getMyBookings, getHallBookings, getAllBookings, updateBookingStatus, cancelBooking } = require('../controllers/bookingController');
const { protect, adminOnly, adminOrOwner, bookingUser } = require('../middleware/authMiddleware');

// Any signed-in account: create and view own bookings
router.post('/', protect, bookingUser, createBooking);
router.get('/my', protect, bookingUser, getMyBookings);
router.put('/:id/cancel', protect, bookingUser, cancelBooking);

// Hall Owner or Admin: view bookings per hall and update status
router.get('/hall/:hallId', protect, adminOrOwner, getHallBookings);
router.put('/:id/status', protect, adminOrOwner, updateBookingStatus);

// Admin only: view all bookings
router.get('/', protect, adminOnly, getAllBookings);

module.exports = router;
