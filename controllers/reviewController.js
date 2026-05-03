const Review = require('../models/Review');
const Booking = require('../models/Booking');
const { normalizePayload, validateReviewPayload } = require('../utils/validation');

// @POST /api/reviews
const createReview = async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only users can create reviews' });
    }

    const payload = normalizePayload(req.body);
    const error = validateReviewPayload(payload);
    if (error) return res.status(400).json({ message: error });
    const { hallId, bookingId, rating, comment } = payload;
    const booking = await Booking.findById(bookingId);
    if (!booking || booking.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized to review this booking' });
    if (booking.hallId.toString() !== hallId)
      return res.status(400).json({ message: 'Review does not match the booked hall' });
    if (booking.status !== 'Approved')
      return res.status(400).json({ message: 'Only approved bookings can be reviewed' });

    const existing = await Review.findOne({ bookingId });
    if (existing) return res.status(400).json({ message: 'Review already submitted' });

    const review = await Review.create({
      userId: req.user._id, hallId, bookingId, rating, comment
    });
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @GET /api/reviews  (Admin)
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate('userId', 'name email')
      .populate('hallId', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @GET /api/reviews/hall/:hallId
const getHallReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ hallId: req.params.hallId })
      .populate('userId', 'name');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @GET /api/reviews/my
const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user._id })
      .populate('hallId', 'name image');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @PUT /api/reviews/:id
const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    const payload = normalizePayload(req.body);
    const nextReview = {
      hallId: review.hallId.toString(),
      bookingId: review.bookingId.toString(),
      rating: Object.prototype.hasOwnProperty.call(payload, 'rating') ? payload.rating : review.rating,
      comment: Object.prototype.hasOwnProperty.call(payload, 'comment') ? payload.comment : review.comment,
    };
    const error = validateReviewPayload(nextReview);
    if (error) return res.status(400).json({ message: error });

    review.rating = Number(nextReview.rating);
    review.comment = nextReview.comment;
    const updated = await review.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @DELETE /api/reviews/:id
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not authorized' });

    await review.deleteOne();
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createReview, getHallReviews, getMyReviews, getAllReviews, updateReview, deleteReview };
