// models/EmailOtp.js
const db = require('../config/db');

const EmailOtp = {
  async deleteByEmail(email) {
    await db.query('DELETE FROM EmailOtps WHERE email = ?', [email]);
  },

  async create(email, otp_code, expired_at) {
    await db.query('INSERT INTO EmailOtps (email, otp_code, expired_at) VALUES (?, ?, ?)', [email, otp_code, expired_at]);
  },

  async findByEmailAndOtp(email, otp_code) {
    const [rows] = await db.query('SELECT * FROM EmailOtps WHERE email = ? AND otp_code = ?', [email, otp_code]);
    return rows;
  }
};

module.exports = EmailOtp;
