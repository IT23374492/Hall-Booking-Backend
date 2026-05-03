const Visitor = require('../models/Visitor');
const Hall = require('../models/Hall');
const { normalizePayload, validateVisitorPayload } = require('../utils/validation');
const { sendEmailSafely } = require('../utils/email');

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
    const visitor = await Visitor.create({
      name, email, phone, purpose,
      hostUserId: req.user._id, hallId, visitDate
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
      .populate('hallId', 'name');
    res.json(visitors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @GET /api/visitors/my
const getMyVisitors = async (req, res) => {
  try {
    const visitors = await Visitor.find({ hostUserId: req.user._id })
      .populate('hallId', 'name location');
    res.json(visitors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @PUT /api/visitors/:id/checkin  (Admin)
const checkInVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
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

// @PUT /api/visitors/:id/checkout  (Admin)
const checkOutVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
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

// @DELETE /api/visitors/:id  (Admin)
const deleteVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndDelete(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    res.json({ message: 'Visitor record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createVisitor, getAllVisitors, getMyVisitors, checkInVisitor, checkOutVisitor, deleteVisitor };
