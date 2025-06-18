const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/payment.controller");
const { verifyToken } = require("../middlewares/authMiddleware");

router.post("/webhook", PaymentController.payOSWebhook);
router.post("/confirm-webhook", verifyToken, PaymentController.confirmWebhook);

module.exports = router;
