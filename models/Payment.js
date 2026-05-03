const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'usd', lowercase: true, trim: true },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Online Slip'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  gateway: {
    type: String,
    enum: ['Manual', 'Slip Upload'],
    default: 'Manual',
  },
  gatewayStatus: { type: String },
  receiptEmail: { type: String },
  transactionId: { type: String },
  paymentReference: { type: String, trim: true },
  slipImage: { type: String },
  paymentDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
