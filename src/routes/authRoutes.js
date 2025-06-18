const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/send-otp", authController.sendOtp); // gui otp
router.post("/verify-otp", authController.verifyOtp); // kiem tra otp
router.post("/register", authController.setPassword); // Tao tk
router.post("/login", authController.loginTraditional); // Đang nhap
router.post("/reset-password", authController.resetPassword); // pass moi

module.exports = router;
