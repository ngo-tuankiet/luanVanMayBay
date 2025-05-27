const jwt = require('jsonwebtoken');const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('../config/db');
const EmailOtp = require('../models/emailOtp');
require('dotenv').config();
 const transporter = nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:process.env.GMAIL_USER,
        pass:process.env.GMAIL_PASS
    }
 });
 function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

exports.sendOtp = async(req,res)=>{
    const {email} = req.body;
  if (!email) return res.status(400).json({ message: 'Vui lòng nhập email' });
  try{
    await EmailOtp.deleteByEmail(email);
    const otp = Math.floor(100000 + Math.random()*900000).toString();//6so
    const expired_at = new Date (Date.now()+ 5*60*1000);//5p
    await EmailOtp.create(email, otp, expired_at);
    await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to:email,
        subject: 'Mã OTP xác thực tài khoản',
        text: `Mã OTP của bạn là: ${otp}. Mã này có hiệu lực trong 5 phút.`

    });
    res.json({ message: 'OTP đã được gửi đến email của bạn' });
  }catch (error) {
        console.error('Lỗi gửi OTP:', error);
        res.status(500).json({ message: 'Không thể gửi OTP', error: error.message });
  }
};
const verifiedEmails = new Set(); 
exports.verifyOtp= async (req,res)=> {
    const {email ,otp} = req.body;
    if(!email||!otp) return res.status(400).json({ message: 'Vui lòng nhập email và OTP' });
    if (!verifiedEmails.has(email))  return res.status(403).json({ message: 'Bạn chưa xác thực OTP cho email này' });

    try { 
        const rows = await EmailOtp.findByEmailAndOtp(email,otp);
        if (rows.length === 0) return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn' });
    await db.query('UPDATE email_otps SET is_verified = TRUE WHERE email = ?', [email]);
        res.json({ message: 'Xác thực OTP thành công', emailVerified: email });
    }catch (error){
        console.error('Lỗi xác thực OTP:', error);
        res.status(500).json({ message: error.message });
    }};
exports.setPassword = async (req, res) => {
    const { email, password, first_name, last_name, phone_number } = req.body;
     if (!email || !password || !first_name || !last_name || !phone_number)   return res.status(400).json({ message: 'Thiếu thông tin đăng ký' });
     if (!isValidEmail(email))   return res.status(400).json({ message: 'Email không hợp lệ' });

try{
    const [existing] = await db.query('SELECT * FROM users WHERE email=?',[email]);
    if (existing.length > 0) return res.status(400).json({ message: 'Email đã được đăng ký' });
    const hashedPassword  = await bcrypt.hash(password,10);
    const [result] = await db.query(
  `INSERT INTO users (username, password, email, first_name, last_name, phone_number, role, is_active)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  [email.split('@')[0], hashedPassword, email, first_name, last_name, phone_number, 'user', true]
);
    const token = jwt.sign(
  { userId: result.insertId, email, role: 'user' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
    res.json({ message: 'Tạo tài khoản thành công', token, user: { userId: result.insertId, email, role: 'user' } });

}catch (error){
     console.error('Lỗi tạo tài khoản:', error);
    res.status(500).json({ message: error.message });
}};
exports.loginTraditional = async (req,res)=> {
    const {email, password} = req.body;
    if(!email || !password)  return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ message: 'Tài khoản không tồn tại' });

    const user = rows[0];
    if (!user.is_active)  return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.' });
    const validPassword = await bcrypt.compare(password,user.password);
    if (!validPassword) return res.status(401).json({ message: 'Sai mật khẩu' });
    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token, user: { userId: user.user_id, email: user.email, role: user.role } });
}catch (error)  {res.status(500).json({ message: error.message });
}};
exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword)
    return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu mới' });

  try {
    const [otpRows] = await db.query('SELECT * FROM email_otps WHERE email = ? AND is_verified = TRUE', [email]);
    if (otpRows.length === 0) {
      return res.status(403).json({ message: 'Bạn chưa xác thực OTP cho email này' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0)
      return res.status(404).json({ message: 'Không tìm thấy tài khoản với email này' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
    await db.query('DELETE FROM email_otps WHERE email = ?', [email]);
    res.json({ message: 'Mật khẩu đã được cập nhật thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
