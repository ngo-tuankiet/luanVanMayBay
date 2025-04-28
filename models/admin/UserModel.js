const db = require('../../config/db');
const bcrypt = require('bcryptjs');

const UserModel = {

  getPaged: (whereSQL, params, limit, offset) => {
    return db.query(
      `SELECT user_id, email, role, is_email_verified, created_at FROM Users ${whereSQL} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
  },

  
  count: (whereSQL, params) => {
    return db.query(`SELECT COUNT(*) AS total FROM Users ${whereSQL}`, params);
  },


  getByEmail: async (email) => {
    const [rows] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
    return rows[0];
  },


  deleteByEmail: async (email) => {
    const [result] = await db.query('DELETE FROM Users WHERE email = ?', [email]);
    return result;
  },

  create: async ({ email, password, role }) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO Users (email, password, role, is_email_verified) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, role, true]
    );
    return result;
  },

  // Cập nhật theo email (password và role)
  updateByEmail: async (email, { password, role }) => {
    const updates = [];
    const params = [];

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hashed);
    }
    if (role) {
      updates.push('role = ?');
      params.push(role);
    }

    const sql = `UPDATE Users SET ${updates.join(', ')} WHERE email = ?`;
    params.push(email);
    const [result] = await db.query(sql, params);
    return result;
  },
};

module.exports = UserModel;
