const db = require("../config/db");
const EmailOtp = {
  async deleteByEmail(email) {
    await db.query("DELETE FROM email_otps WHERE email = ?", [email]);
  },
  async create(email, otp_code, expired_at) {
    await db.query(
      "INSERT INTO email_otps(email,otp_code,expired_at)VALUES (?,?,?)",
      [email, otp_code, expired_at]
    );
  },
  async findByEmailAndOtp(email, otp_code) {
    const [rows] = await db.query(
      "SELECT * FROM email_otps WHERE email = ? AND otp_code = ? AND expired_at > NOW()",
      [email, otp_code]
    );
    return rows;
  },
};
module.exports = EmailOtp;
