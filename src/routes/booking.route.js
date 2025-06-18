const express = require("express");
const router = express.Router();
const BookingController = require("../controllers/booking.controller");
const { verifyToken } = require("../middlewares/authMiddleware");

router.post("/confirm", verifyToken, BookingController.confirm);
router.post("/preview", verifyToken, BookingController.preview);

module.exports = router;
