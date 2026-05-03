const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  purpose: { type: String, required: true },
  hostUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hallId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hall' },
  visitDate: { type: Date, required: true },
  checkInTime: { type: String },
  checkOutTime: { type: String },
  status: {
    type: String,
    enum: ['Scheduled', 'Checked-In', 'Checked-Out', 'Cancelled'],
    default: 'Scheduled'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Visitor', visitorSchema);
