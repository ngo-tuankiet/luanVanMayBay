const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken, verifyTokenOptional } = require('../middlewares/authMiddleware');

router.post('/confirm', verifyToken, bookingController.createSmartBooking);
router.get('/my-bookings', verifyToken, bookingController.getUserBookings);
router.post('/preview', verifyTokenOptional, bookingController.previewBooking);
module.exports = router;
    