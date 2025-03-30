// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Endpoint gửi OTP đến email (Signup - Step 1)
router.post('/signup/email', authController.sendOtp);

// Endpoint xác nhận OTP (Signup - Step 2)
router.post('/signup/verify-otp', authController.verifyOtp);

// Endpoint đặt mật khẩu và tạo tài khoản (Signup - Step 3)
router.post('/signup/set-password', authController.setPassword);

// Endpoint đăng nhập truyền thống (email + mật khẩu)
router.post('/login', authController.loginTraditional);

module.exports = router;
