const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Hall = require('../models/Hall');
const User = require('../models/User');
const { normalizePayload, validatePaymentPayload } = require('../utils/validation');
const { sendEmailSafely } = require('../utils/email');

const getPaymentCurrency = () => (process.env.PAYMENT_CURRENCY || 'usd').toLowerCase();

const populatePayments = (query) =>
  query
    .populate('userId', 'name email')
    .populate({
      path: 'bookingId',
      populate: { path: 'hallId', select: 'name location ownerId' },
    });

const buildReceiptEmail = (reqUser, fallbackUser) => reqUser?.email || fallbackUser?.email || '';

const createPayment = async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only users can create payments' });
    }

    const payload = normalizePayload(req.body);
    const error = validatePaymentPayload(payload);
    if (error) return res.status(400).json({ message: error });

    const { bookingId, paymentMethod, paymentReference } = payload;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to pay for this booking' });
    }
    if (booking.status !== 'Approved') {
      return res.status(400).json({ message: 'Payment is available only after booking approval' });
    }

    const existingPayment = await Payment.findOne({
      bookingId,
      paymentMethod,
      paymentStatus: { $ne: 'Failed' },
    });
    if (existingPayment) {
      return res.status(400).json({ message: `${paymentMethod} payment already exists for this booking` });
    }

    if (paymentMethod === 'Online Slip' && !req.file) {
      return res.status(400).json({ message: 'Please upload a payment slip image for online payments.' });
    }

    const transactionPrefix = paymentMethod === 'Online Slip' ? 'SLIP' : 'CASH';
    const payment = await Payment.create({
      bookingId,
      userId: req.user._id,
      amount: booking.totalPrice,
      currency: getPaymentCurrency(),
      paymentMethod,
      paymentStatus: 'Pending',
      gateway: paymentMethod === 'Online Slip' ? 'Slip Upload' : 'Manual',
      gatewayStatus: paymentMethod === 'Online Slip' ? 'slip_uploaded_pending_review' : 'pending_cash_confirmation',
      transactionId: `${transactionPrefix}-${Date.now()}`,
      receiptEmail: buildReceiptEmail(req.user),
      paymentReference: paymentReference || '',
      slipImage: req.file ? `/uploads/${req.file.filename}` : '',
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyPayments = async (req, res) => {
  try {
    const payments = await populatePayments(Payment.find({ userId: req.user._id }));
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOwnerPayments = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const payments = await populatePayments(Payment.find({}));
      return res.json(payments);
    }

    const ownerHallIds = await Hall.find({ ownerId: req.user._id }).distinct('_id');
    const bookingIds = await Booking.find({ hallId: { $in: ownerHallIds } }).distinct('_id');
    const payments = await populatePayments(Payment.find({ bookingId: { $in: bookingIds } }));
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const payments = await populatePayments(Payment.find({}));
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = normalizePayload(req.body);
    const allowedStatuses = ['Pending', 'Completed', 'Refunded', 'Failed'];
    if (!allowedStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status.' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    payment.paymentStatus = paymentStatus;
    payment.gatewayStatus = paymentStatus === 'Completed'
      ? 'completed'
      : paymentStatus === 'Refunded'
        ? 'refunded'
        : paymentStatus.toLowerCase();
    if (paymentStatus === 'Completed') {
      payment.paymentDate = new Date();
    }
    await payment.save();

    if (paymentStatus === 'Refunded') {
      const user = await User.findById(payment.userId).select('name email');
      if (user?.email) {
        sendEmailSafely({
          to: user.email,
          subject: 'Payment refunded',
          text: `Hello ${user.name}, your payment for booking ${payment.bookingId} has been refunded.`,
        });
      }
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const refundPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.paymentStatus !== 'Completed') {
      return res.status(400).json({ message: 'Only completed payments can be refunded.' });
    }

    payment.paymentStatus = 'Refunded';
    payment.gatewayStatus = 'refunded';
    await payment.save();

    const user = await User.findById(payment.userId).select('name email');
    if (user?.email) {
      sendEmailSafely({
        to: user.email,
        subject: 'Payment refunded',
        text: `Hello ${user.name}, your payment for booking ${payment.bookingId} has been refunded.`,
      });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ message: 'Payment record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPayment,
  getMyPayments,
  getOwnerPayments,
  getAllPayments,
  updatePaymentStatus,
  refundPayment,
  deletePayment,
};
