// models/User.js
const db = require('../config/db');

const User = {
  async findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
    return rows;
  },

  async createUser({ email, password, is_email_verified, role }) {
    const [result] = await db.query(
      'INSERT INTO Users (email, password, is_email_verified, role) VALUES (?, ?, ?, ?)',
      [email, password, is_email_verified, role]
    );
    return result.insertId;
  },

  async updatePassword(email, hashedPassword) {
    const [result] = await db.query('UPDATE Users SET password = ? WHERE email = ?', [hashedPassword, email]);
    return result.affectedRows;
  }
};

module.exports = User;
