// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('../config/db');
require('dotenv').config();

// Cấu hình NodeMailer sử dụng Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,    // Email từ .env
    pass: process.env.GMAIL_PASS     // App Password hoặc mật khẩu Gmail (nếu không dùng 2FA)
  }
});

// Gửi OTP qua email (Signup - Bước 1)
exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Vui lòng nhập email' });
  }
  try {
    // Xóa OTP cũ cho email này nếu có
    await db.query('DELETE FROM EmailOtps WHERE email = ?', [email]);
    // Sinh OTP 6 chữ số và tính thời gian hết hạn (5 phút sau)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiredAt = new Date(Date.now() + 5 * 60 * 1000);
    // Lưu OTP vào bảng EmailOtps
    await db.query('INSERT INTO EmailOtps (email, otp_code, expired_at) VALUES (?, ?, ?)', [email, otp, expiredAt]);
    // Gửi OTP qua email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Mã OTP xác thực tài khoản của bạn',
      text: `Mã OTP của bạn là: ${otp}. Mã này sẽ hết hạn sau 5 phút.`
    };
    let info = await transporter.sendMail(mailOptions);
    res.json({ message: 'OTP đã được gửi đến email của bạn', info });
  } catch (error) {
    console.error('Lỗi gửi OTP:', error);
    res.status(500).json({ message: 'Có lỗi xảy ra khi gửi OTP', error: error.message });
  }
};

// Xác nhận OTP (Signup - Bước 2)
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Vui lòng nhập email và OTP' });
  }
  try {
    const [rows] = await db.query('SELECT * FROM EmailOtps WHERE email = ? AND otp_code = ?', [email, otp]);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'OTP không đúng hoặc đã hết hạn' });
    }
    // Xóa OTP sau khi xác thực thành công
    await db.query('DELETE FROM EmailOtps WHERE email = ?', [email]);
    res.json({ message: 'Xác thực OTP thành công', emailVerified: email });
  } catch (error) {
    console.error('Lỗi xác thực OTP:', error);
    res.status(500).json({ message: error.message });
  }
};

// Đặt mật khẩu và tạo tài khoản (Signup - Bước 3)
exports.setPassword = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
  }
  try {
    // Kiểm tra xem email đã được đăng ký chưa
    const [existing] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email đã được đăng ký' });
    }
    // Hash mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);
    // Chèn tài khoản mới, đánh dấu rằng email đã được xác thực
    // Lưu ý: Bảng Users cần có cột is_email_verified
    const [result] = await db.query(
      `INSERT INTO Users (email, password, is_email_verified, role) VALUES (?, ?, ?, ?)`,
      [email, hashedPassword, true, 'Passenger']
    );
    // Tạo JWT token cho user mới
    const token = jwt.sign(
      { userId: result.insertId, email, role: 'Passenger' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ message: 'Tạo tài khoản thành công', token, user: { userId: result.insertId, email, role: 'Passenger' } });
  } catch (error) {
    console.error('Lỗi tạo tài khoản:', error);
    res.status(500).json({ message: error.message });
  }
};

// Đăng nhập truyền thống (Login)
exports.loginTraditional = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
  }
  try {
    const [rows] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Tài khoản không tồn tại' });
    }
    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Sai mật khẩu' });
    }
    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token, user: { userId: user.user_id, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ message: error.message });
  }
};
