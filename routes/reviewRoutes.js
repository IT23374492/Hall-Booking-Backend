const express = require('express');
const router = express.Router();
const { createReview, getHallReviews, getMyReviews, getAllReviews, updateReview, deleteReview } = require('../controllers/reviewController');
const { protect, adminOnly, userOnly } = require('../middleware/authMiddleware');

// Public: view hall reviews
router.get('/hall/:hallId', getHallReviews);

// User: create, view, update own reviews
router.post('/', protect, userOnly, createReview);
router.get('/my', protect, userOnly, getMyReviews);
router.get('/', protect, adminOnly, getAllReviews);
router.put('/:id', protect, userOnly, updateReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
