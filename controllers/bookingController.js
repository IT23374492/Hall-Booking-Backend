const Booking = require('../models/Booking');
const Hall = require('../models/Hall');
const User = require('../models/User');
const {
  normalizePayload,
  validateBookingPayload,
  validateBookingStatus,
} = require('../utils/validation');
const { parseTimeToMinutes, rangesOverlap } = require('../utils/time');
const { sendEmailSafely } = require('../utils/email');

const findConflictingBooking = async ({ hallId, bookingDate, startTime, endTime, excludeBookingId, statuses }) => {
  const bookings = await Booking.find({
    hallId,
    bookingDate: new Date(bookingDate),
    status: { $in: statuses || ['Pending', 'Approved'] },
    ...(excludeBookingId ? { _id: { $ne: excludeBookingId } } : {}),
  }).populate('userId', 'name email');

  const requestedStart = parseTimeToMinutes(startTime);
  const requestedEnd = parseTimeToMinutes(endTime);
  if (requestedStart === null || requestedEnd === null) return null;

  return bookings.find((booking) => {
    const bookingStart = parseTimeToMinutes(booking.startTime);
    const bookingEnd = parseTimeToMinutes(booking.endTime);
    return (
      bookingStart !== null &&
      bookingEnd !== null &&
      rangesOverlap(requestedStart, requestedEnd, bookingStart, bookingEnd)
    );
  }) || null;
};

// @POST /api/bookings  - Any signed-in account
const createBooking = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const error = validateBookingPayload(payload);
    if (error) return res.status(400).json({ message: error });
    const { hallId, bookingDate, startTime, endTime, totalHours, purpose } = payload;
    const hall = await Hall.findById(hallId).populate('ownerId', 'name email');
    if (!hall) return res.status(404).json({ message: 'Hall not found' });
    if (!hall.availabilityStatus)
      return res.status(400).json({ message: 'Hall is not available' });

    const conflictingBooking = await findConflictingBooking({
      hallId,
      bookingDate,
      startTime,
      endTime,
    });
    if (conflictingBooking) {
      return res.status(409).json({ message: 'This hall is already booked for the selected date and time.' });
    }

    const totalPrice = hall.pricePerHour * Number(totalHours);
    const booking = await Booking.create({
      userId: req.user._id, hallId, bookingDate,
      startTime, endTime, totalHours: Number(totalHours), totalPrice, purpose
    });

    sendEmailSafely({
      to: req.user.email,
      subject: 'Booking request received',
      text: `Hello ${req.user.name}, your booking request for ${hall.name} on ${bookingDate} from ${startTime} to ${endTime} has been received.`,
    });
    sendEmailSafely({
      to: hall.ownerId?.email,
      subject: 'New booking request for your hall',
      text: `A new booking request was created for ${hall.name} on ${bookingDate} from ${startTime} to ${endTime}.`,
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @GET /api/bookings/my  - Signed-in account: see own bookings
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('hallId', 'name location image pricePerHour');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @GET /api/bookings/hall/:hallId  - Hall Owner: see bookings for their hall
const getHallBookings = async (req, res) => {
  try {
    const hall = await Hall.findById(req.params.hallId);
    if (!hall) return res.status(404).json({ message: 'Hall not found' });

    if (req.user.role === 'hall_owner' && hall.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized to view these bookings' });

    const bookings = await Booking.find({ hallId: req.params.hallId })
      .populate('userId', 'name email phone');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @GET /api/bookings  - Admin only: all bookings
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('userId', 'name email')
      .populate('hallId', 'name location');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @PUT /api/bookings/:id/status  - Hall Owner (own hall bookings) or Admin
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = normalizePayload(req.body);
    if (!validateBookingStatus(status)) {
      return res.status(400).json({ message: 'Invalid booking status.' });
    }
    const booking = await Booking.findById(req.params.id).populate('hallId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (req.user.role === 'hall_owner' &&
        booking.hallId.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized to update this booking' });

    if (booking.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending bookings can be updated.' });
    }
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Bookings can only move from Pending to Approved or Rejected.' });
    }

    if (status === 'Approved') {
      const conflictingBooking = await findConflictingBooking({
        hallId: booking.hallId._id,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        excludeBookingId: booking._id,
        statuses: ['Approved'],
      });
      if (conflictingBooking) {
        return res.status(409).json({ message: 'This booking overlaps with another approved booking for the same hall.' });
      }
    }

    booking.status = status;
    await booking.save();

    const bookingUser = await User.findById(booking.userId).select('name email');
    if (bookingUser?.email) {
      sendEmailSafely({
        to: bookingUser.email,
        subject: `Booking ${status.toLowerCase()}`,
        text: `Hello ${bookingUser.name}, your booking for ${booking.hallId.name} on ${new Date(booking.bookingDate).toISOString().slice(0, 10)} from ${booking.startTime} to ${booking.endTime} was ${status.toLowerCase()}.`,
      });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @PUT /api/bookings/:id/cancel  - Signed-in account: cancel their own booking
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('hallId', 'name ownerId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    if (booking.status !== 'Pending')
      return res.status(400).json({ message: 'Only pending bookings can be cancelled' });

    booking.status = 'Cancelled';
    await booking.save();

    const owner = booking.hallId?.ownerId ? await User.findById(booking.hallId.ownerId).select('name email') : null;
    sendEmailSafely({
      to: req.user.email,
      subject: 'Booking cancelled',
      text: `Hello ${req.user.name}, your booking for ${booking.hallId?.name || 'the selected hall'} on ${new Date(booking.bookingDate).toISOString().slice(0, 10)} has been cancelled.`,
    });
    if (owner?.email) {
      sendEmailSafely({
        to: owner.email,
        subject: 'Booking cancelled by user',
        text: `A booking for ${booking.hallId?.name || 'your hall'} on ${new Date(booking.bookingDate).toISOString().slice(0, 10)} was cancelled by the user.`,
      });
    }

    res.json({ message: 'Booking cancelled', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createBooking, getMyBookings, getHallBookings, getAllBookings, updateBookingStatus, cancelBooking };
