const Visitor = require('../models/Visitor');
const Hall = require('../models/Hall');
const Booking = require('../models/Booking');
const { normalizePayload, validateVisitorPayload } = require('../utils/validation');
const { sendEmailSafely } = require('../utils/email');

const canManageVisitor = async (user, visitor) => {
  if (!user || !visitor) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'user') {
    return String(visitor.hostUserId) === String(user._id);
  }
  if (user.role === 'hall_owner') {
    const hall = await Hall.findById(visitor.hallId).select('ownerId');
    return Boolean(hall) && String(hall.ownerId) === String(user._id);
  }
  return false;
};

// @POST /api/visitors
const createVisitor = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const error = validateVisitorPayload(payload);
    if (error) return res.status(400).json({ message: error });
    const { name, email, phone, purpose, hallId, visitDate } = payload;
    const hall = await Hall.findById(hallId);
    if (!hall) return res.status(404).json({ message: 'Hall not found' });
    if (req.user.role === 'hall_owner' && String(hall.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Hall owners can only register visitors for their own halls' });
    }
    let matchingBooking = null;
    if (req.user.role === 'user') {
      const bookingStart = new Date(`${visitDate}T00:00:00.000Z`);
      const bookingEnd = new Date(`${visitDate}T23:59:59.999Z`);
      matchingBooking = await Booking.findOne({
        userId: req.user._id,
        hallId,
        status: 'Approved',
        bookingDate: {
          $gte: bookingStart,
          $lte: bookingEnd,
        },
      });

      if (!matchingBooking) {
        return res.status(400).json({ message: 'Visitors can only be registered for your approved booking date.' });
      }
    }

    const visitor = await Visitor.create({
      name, email, phone, purpose,
      hostUserId: req.user._id,
      bookingId: matchingBooking?._id,
      hallId,
      visitDate,
    });

    sendEmailSafely({
      to: email,
      subject: 'Visitor registration confirmed',
      text: `Hello ${name}, your visit for ${visitDate} has been registered successfully.`,
    });

    res.status(201).json(visitor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @GET /api/visitors  (Admin)
const getAllVisitors = async (req, res) => {
  try {
    const visitors = await Visitor.find({})
      .populate('hostUserId', 'name email')
      .populate('bookingId', 'bookingDate startTime endTime')
      .populate('hallId', 'name');
    res.json(visitors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @GET /api/visitors/my
const getMyVisitors = async (req, res) => {
  try {
    let query = { hostUserId: req.user._id };

    if (req.user.role === 'hall_owner') {
      const ownedHalls = await Hall.find({ ownerId: req.user._id }).select('_id');
      query = { hallId: { $in: ownedHalls.map((hall) => hall._id) } };
    }

    const visitors = await Visitor.find(query)
      .populate('bookingId', 'bookingDate startTime endTime')
      .populate('hallId', 'name location')
      .sort({ visitDate: 1, createdAt: -1 });
    res.json(visitors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @PUT /api/visitors/:id/checkin
const checkInVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    if (!(await canManageVisitor(req.user, visitor))) {
      return res.status(403).json({ message: 'You are not allowed to manage this visitor' });
    }
    if (visitor.status === 'Checked-In') {
      return res.status(400).json({ message: 'Visitor is already checked in' });
    }
    const timestamp = new Date().toISOString();
    visitor.status = 'Checked-In';
    visitor.checkInTime = timestamp;
    await visitor.save();
    res.json(visitor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @PUT /api/visitors/:id/checkout
const checkOutVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    if (!(await canManageVisitor(req.user, visitor))) {
      return res.status(403).json({ message: 'You are not allowed to manage this visitor' });
    }
    if (visitor.status !== 'Checked-In') {
      return res.status(400).json({ message: 'Visitor must be checked in before check out' });
    }
    const timestamp = new Date().toISOString();
    visitor.status = 'Checked-Out';
    visitor.checkOutTime = timestamp;
    await visitor.save();
    res.json(visitor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @DELETE /api/visitors/:id
const deleteVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    if (!(await canManageVisitor(req.user, visitor))) {
      return res.status(403).json({ message: 'You are not allowed to delete this visitor' });
    }
    await Visitor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Visitor record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createVisitor, getAllVisitors, getMyVisitors, checkInVisitor, checkOutVisitor, deleteVisitor };
