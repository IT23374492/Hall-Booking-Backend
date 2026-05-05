const Hall = require('../models/Hall');
const Booking = require('../models/Booking');
const { normalizePayload, parseAmenities, validateHallPayload } = require('../utils/validation');
const { parseTimeToMinutes, rangesOverlap } = require('../utils/time');

// @GET /api/halls  - All roles can view
const getAllHalls = async (req, res) => {
  try {
    const filter = {};
    if (req.query.hallType) filter.hallType = req.query.hallType;
    if (req.query.available) filter.availabilityStatus = req.query.available === 'true';
    const halls = await Hall.find(filter).populate('ownerId', 'name email phone');

    const { bookingDate, startTime, endTime } = req.query;
    if (!bookingDate || !startTime || !endTime) {
      return res.json(halls);
    }

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      return res.json(halls);
    }

    const bookings = await Booking.find({
      hallId: { $in: halls.map((hall) => hall._id) },
      bookingDate: new Date(bookingDate),
      status: { $in: ['Pending', 'Approved'] },
    }).select('hallId startTime endTime');

    const conflictingHallIds = new Set();
    bookings.forEach((booking) => {
      const bookingStart = parseTimeToMinutes(booking.startTime);
      const bookingEnd = parseTimeToMinutes(booking.endTime);
      if (
        bookingStart !== null &&
        bookingEnd !== null &&
        rangesOverlap(startMinutes, endMinutes, bookingStart, bookingEnd)
      ) {
        conflictingHallIds.add(String(booking.hallId));
      }
    });

    return res.json(
      halls.map((hall) => ({
        ...hall.toObject(),
        isAvailableForRequestedSlot: !conflictingHallIds.has(String(hall._id)),
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @GET /api/halls/my  - Hall Owner: see only their halls
const getMyHalls = async (req, res) => {
  try {
    const halls = await Hall.find({ ownerId: req.user._id });
    res.json(halls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @GET /api/halls/:id  - All roles
const getHallById = async (req, res) => {
  try {
    const hall = await Hall.findById(req.params.id).populate('ownerId', 'name email phone');
    if (!hall) return res.status(404).json({ message: 'Hall not found' });
    res.json(hall);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @POST /api/halls  - Hall Owner or Admin
const createHall = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const error = validateHallPayload(payload);
    if (error) return res.status(400).json({ message: error });
    const { name, description, capacity, pricePerHour, location, amenities, hallType } = payload;

    const image = req.file ? `/uploads/${req.file.filename}` : null;
    const hall = await Hall.create({
      ownerId: req.user._id,
      name, description, capacity: Number(capacity),
      pricePerHour: Number(pricePerHour), location,
      amenities: parseAmenities(amenities),
      hallType, image
    });
    res.status(201).json(hall);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @PUT /api/halls/:id  - Hall Owner (own halls) or Admin
const updateHall = async (req, res) => {
  try {
    const hall = await Hall.findById(req.params.id);
    if (!hall) return res.status(404).json({ message: 'Hall not found' });

    // Hall owner can only update their own hall
    if (req.user.role === 'hall_owner' && hall.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized to update this hall' });

    const payload = normalizePayload(req.body);
    const mergedPayload = {
      name: Object.prototype.hasOwnProperty.call(payload, 'name') ? payload.name : hall.name,
      description: Object.prototype.hasOwnProperty.call(payload, 'description') ? payload.description : hall.description,
      capacity: Object.prototype.hasOwnProperty.call(payload, 'capacity') ? payload.capacity : hall.capacity,
      pricePerHour: Object.prototype.hasOwnProperty.call(payload, 'pricePerHour') ? payload.pricePerHour : hall.pricePerHour,
      location: Object.prototype.hasOwnProperty.call(payload, 'location') ? payload.location : hall.location,
      hallType: Object.prototype.hasOwnProperty.call(payload, 'hallType') ? payload.hallType : hall.hallType,
      amenities: Object.prototype.hasOwnProperty.call(payload, 'amenities') ? payload.amenities : hall.amenities,
    };
    const error = validateHallPayload(mergedPayload);
    if (error) return res.status(400).json({ message: error });

    const image = req.file ? `/uploads/${req.file.filename}` : hall.image;
    const amenities = Object.prototype.hasOwnProperty.call(payload, 'amenities')
      ? parseAmenities(payload.amenities)
      : hall.amenities;
    const availabilityStatus = Object.prototype.hasOwnProperty.call(payload, 'availabilityStatus')
      ? payload.availabilityStatus === true || payload.availabilityStatus === 'true'
      : hall.availabilityStatus;

    const updated = await Hall.findByIdAndUpdate(
      req.params.id,
      {
        ...payload,
        ...mergedPayload,
        image,
        amenities,
        availabilityStatus,
        capacity: Number(mergedPayload.capacity),
        pricePerHour: Number(mergedPayload.pricePerHour),
      },
      { new: true, runValidators: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @DELETE /api/halls/:id  - Hall Owner (own halls) or Admin
const deleteHall = async (req, res) => {
  try {
    const hall = await Hall.findById(req.params.id);
    if (!hall) return res.status(404).json({ message: 'Hall not found' });

    if (req.user.role === 'hall_owner' && hall.ownerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized to delete this hall' });

    await hall.deleteOne();
    res.json({ message: 'Hall deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllHalls, getMyHalls, getHallById, createHall, updateHall, deleteHall };
