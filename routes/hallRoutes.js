const express = require('express');
const router = express.Router();
const { getAllHalls, getMyHalls, getHallById, createHall, updateHall, deleteHall } = require('../controllers/hallController');
const { protect, adminOrOwner, hallOwnerOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public (no auth needed to browse halls)
router.get('/', getAllHalls);

// Hall Owner only - view own halls
router.get('/owner/my', protect, hallOwnerOnly, getMyHalls);

// Hall Owner or Admin - create/update/delete
router.post('/', protect, adminOrOwner, upload.single('image'), createHall);
router.put('/:id', protect, adminOrOwner, upload.single('image'), updateHall);
router.delete('/:id', protect, adminOrOwner, deleteHall);
router.get('/:id', getHallById);

module.exports = router;
