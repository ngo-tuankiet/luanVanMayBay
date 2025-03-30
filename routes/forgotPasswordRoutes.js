// routes/forgotPasswordRoutes.js
const express = require("express");
const router = express.Router();
const forgotPasswordController = require("../controllers/forgotPasswordController");

// Forgot Password Flow
router.post('/forgot-password/email', forgotPasswordController.sendForgotPasswordOtp);
router.post('/forgot-password/verify-otp', forgotPasswordController.verifyForgotPasswordOtp);
router.post('/forgot-password/reset-password', forgotPasswordController.resetPassword);

module.exports = router;
