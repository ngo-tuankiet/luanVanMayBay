// controllers/forgotPasswordController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Cấu hình NodeMailer sử dụng Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// Bước 1: Gửi OTP cho Quên mật khẩu
exports.sendForgotPasswordOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Vui lòng nhập email' });
  try {
    const [users] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(404).json({ message: 'Email chưa được đăng ký' });
    await db.query('DELETE FROM EmailOtps WHERE email = ?', [email]);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiredAt = new Date(Date.now() + 5 * 60 * 1000);
    await db.query('INSERT INTO EmailOtps (email, otp_code, expired_at) VALUES (?, ?, ?)', [email, otp, expiredAt]);
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Mã OTP đặt lại mật khẩu',
      text: `Mã OTP của bạn là: ${otp}. Mã này sẽ hết hạn sau 5 phút.`
    };
    let info = await transporter.sendMail(mailOptions);
    res.json({ message: 'OTP đã được gửi đến email của bạn', info });
  } catch (error) {
    console.error('Lỗi gửi OTP quên mk:', error);
    res.status(500).json({ message: error.message });
  }
};

// Bước 2: Xác nhận OTP cho Quên mật khẩu
exports.verifyForgotPasswordOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Vui lòng nhập email và OTP' });
  try {
    const [rows] = await db.query('SELECT * FROM EmailOtps WHERE email = ? AND otp_code = ?', [email, otp]);
    if (rows.length === 0) return res.status(400).json({ message: 'OTP không đúng hoặc đã hết hạn' });
    await db.query('DELETE FROM EmailOtps WHERE email = ?', [email]);
    res.json({ message: 'Xác thực OTP thành công', emailVerified: email });
  } catch (error) {
    console.error('Lỗi xác thực OTP quên mk:', error);
    res.status(500).json({ message: error.message });
  }
};

// Bước 3: Đặt lại mật khẩu cho Quên mật khẩu
exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu mới' });
  try {
    const [users] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(404).json({ message: 'Tài khoản không tồn tại' });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE Users SET password = ? WHERE email = ?', [hashedPassword, email]);
    res.json({ message: 'Mật khẩu đã được cập nhật thành công' });
  } catch (error) {
    console.error('Lỗi reset password:', error);
    res.status(500).json({ message: error.message });
  }
};
