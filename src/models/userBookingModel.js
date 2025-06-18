const db = require("../config/db");
const UserBookingModel = {
  async getBookingsByUserId(user_id) {
    const [rows] = await db.query(
      "SELECT b.booking_id,  b.check_in_date,  b.check_out_date, b.total_price, b.booking_status, r.room_number, rt.type_name AS room_type_name FROM bookings b JOIN rooms r ON b.room_id = r.room_id JOIN room_types rt ON r.room_type_id = rt.room_type_id WHERE b.user_id = ?  ORDER BY b.check_in_date DESC",
      [user_id]
    );
    return rows;
  },
};
module.exports = UserBookingModel;
