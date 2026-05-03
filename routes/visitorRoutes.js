const express = require('express');
const router = express.Router();
const { createVisitor, getAllVisitors, getMyVisitors, checkInVisitor, checkOutVisitor, deleteVisitor } = require('../controllers/visitorController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// User: register visitor, view own visitors
router.post('/', protect, createVisitor);
router.get('/my', protect, getMyVisitors);

// Admin only
router.get('/', protect, adminOnly, getAllVisitors);
router.put('/:id/checkin', protect, adminOnly, checkInVisitor);
router.put('/:id/checkout', protect, adminOnly, checkOutVisitor);
router.delete('/:id', protect, adminOnly, deleteVisitor);

module.exports = router;
