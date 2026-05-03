const mongoose = require('mongoose');

const hallSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  capacity: { type: Number, required: true },
  pricePerHour: { type: Number, required: true },
  location: { type: String, required: true },
  placeDetails: {
    addressLine: { type: String },
    area: { type: String },
    city: { type: String },
    state: { type: String },
    landmark: { type: String },
    mapLabel: { type: String },
    parkingInfo: { type: String },
  },
  amenities: [{ type: String }],
  image: { type: String },
  imageGallery: [{ type: String }],
  availabilityStatus: { type: Boolean, default: true },
  hallType: {
    type: String,
    enum: ['Conference', 'Banquet', 'Auditorium', 'Seminar', 'Sports'],
    required: true
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Hall', hallSchema);
