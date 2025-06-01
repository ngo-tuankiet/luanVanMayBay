const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/smart', verifyToken, bookingController.createSmartBooking);
router.get('/my-bookings', verifyToken, bookingController.getUserBookings);

module.exports = router;
