const express = require('express');
const router = express.Router();
const { createVisitor, getAllVisitors, getMyVisitors, checkInVisitor, checkOutVisitor, deleteVisitor } = require('../controllers/visitorController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// User: register visitor, view own visitors
router.post('/', protect, createVisitor);
router.get('/my', protect, getMyVisitors);

// Admin only
router.get('/', protect, adminOnly, getAllVisitors);
// Users, hall owners, and admins can manage allowed visitor logs
router.put('/:id/checkin', protect, checkInVisitor);
router.put('/:id/checkout', protect, checkOutVisitor);
router.delete('/:id', protect, deleteVisitor);

module.exports = router;
