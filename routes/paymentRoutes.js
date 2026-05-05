const express = require('express');
const router = express.Router();
const { createPayment, getMyPayments, getOwnerPayments, getAllPayments, updatePaymentStatus, refundPayment, deletePayment } = require('../controllers/paymentController');
const { protect, adminOnly, adminOrOwner, userOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// User: create and view own payments
router.post('/', protect, userOnly, upload.single('slipImage'), createPayment);
router.get('/my', protect, userOnly, getMyPayments);

// Hall Owner: view payments for their halls
router.get('/hall', protect, adminOrOwner, getOwnerPayments);

// Admin or hall owner (own halls only)
router.get('/', protect, adminOnly, getAllPayments);
router.put('/:id/status', protect, adminOrOwner, updatePaymentStatus);

// Admin only
router.put('/:id/refund', protect, adminOnly, refundPayment);
router.delete('/:id', protect, adminOnly, deletePayment);

module.exports = router;
