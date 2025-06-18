const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const db = require("../config/db");
const EmailOtp = require("../models/EmailOtp");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res
      .status(400)
      .json({ statusCode: 400, message: "Vui lòng nhập email" });

  try {
    await EmailOtp.deleteByEmail(email);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expired_at = new Date(Date.now() + 5 * 60 * 1000);

    await EmailOtp.create(email, otp, expired_at);

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Mã OTP xác thực tài khoản",
      text: `Mã OTP của bạn là: ${otp}. Mã này có hiệu lực trong 5 phút.`,
    });

    res
      .status(200)
      .json({ statusCode: 200, message: "OTP đã được gửi đến email của bạn" });
  } catch (error) {
    console.error("Lỗi gửi OTP:", error);
    res.status(500).json({
      statusCode: 500,
      message: "Không thể gửi OTP",
      error: error.message,
    });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res
      .status(400)
      .json({ statusCode: 400, message: "Vui lòng nhập email và OTP" });

  try {
    const [rows] = await db.query(
      `
      SELECT * FROM email_otps 
      WHERE email = ? 
        AND otp_code = ? 
        AND expired_at > NOW()
    `,
      [email, otp]
    );

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ statusCode: 400, message: "OTP không hợp lệ hoặc đã hết hạn" });
    }

    await db.query(`UPDATE email_otps SET is_verified = TRUE WHERE email = ?`, [
      email,
    ]);

    res.status(200).json({
      statusCode: 200,
      message: "Xác thực OTP thành công",
      data: { emailVerified: email },
    });
  } catch (error) {
    console.error("Lỗi xác thực OTP:", error);
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

exports.setPassword = async (req, res) => {
  const { email, password, first_name, last_name, phone_number } = req.body;
  if (!email || !password || !first_name || !last_name || !phone_number)
    return res
      .status(400)
      .json({ statusCode: 400, message: "Thiếu thông tin đăng ký" });

  if (!isValidEmail(email))
    return res
      .status(400)
      .json({ statusCode: 400, message: "Email không hợp lệ" });

  try {
    const [existing] = await db.query("SELECT * FROM users WHERE email=?", [
      email,
    ]);
    if (existing.length > 0)
      return res
        .status(400)
        .json({ statusCode: 400, message: "Email đã được đăng ký" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (username, password, email, first_name, last_name, phone_number, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email.split("@")[0],
        hashedPassword,
        email,
        first_name,
        last_name,
        phone_number,
        "user",
        true,
      ]
    );

    res.status(200).json({
      statusCode: 200,
      message: "Tạo tài khoản thành công",
      data: {
        user: {
          userId: result.insertId,
          email,
          role: "user",
        },
      },
    });
  } catch (error) {
    console.error("Lỗi tạo tài khoản:", error);
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

exports.loginTraditional = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .json({ statusCode: 400, message: "Vui lòng nhập email và mật khẩu" });

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res
        .status(401)
        .json({ statusCode: 401, message: "Tài khoản không tồn tại" });

    const user = rows[0];
    if (!user.is_active)
      return res.status(403).json({
        statusCode: 403,
        message:
          "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
      });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ statusCode: 401, message: "Sai mật khẩu" });

    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      statusCode: 200,
      message: "Đăng nhập thành công",
      data: {
        token,
        user: {
          userId: user.user_id,
          email: user.email,
          phone: user.phone_number,
          fullName: `${user.first_name} ${user.last_name}`,
          role: user.role.toUpperCase(),
          avatar: user.avatar || null,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword)
    return res.status(400).json({
      statusCode: 400,
      message: "Vui lòng nhập email và mật khẩu mới",
    });

  try {
    const [otpRows] = await db.query(
      `
      SELECT * FROM email_otps 
      WHERE email = ? AND is_verified = TRUE
    `,
      [email]
    );

    if (otpRows.length === 0) {
      return res.status(403).json({
        statusCode: 403,
        message: "Bạn chưa xác thực OTP cho email này",
      });
    }

    const [users] = await db.query(`SELECT * FROM users WHERE email = ?`, [
      email,
    ]);
    if (users.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "Không tìm thấy tài khoản với email này",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query(`UPDATE users SET password = ? WHERE email = ?`, [
      hashedPassword,
      email,
    ]);
    await db.query(`DELETE FROM email_otps WHERE email = ?`, [email]);

    res.status(200).json({
      statusCode: 200,
      message: "Mật khẩu đã được cập nhật thành công",
    });
  } catch (error) {
    console.error("Lỗi đặt lại mật khẩu:", error);
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};
