  const db = require('../config/db');
  const BookingModel = {
      async checkRoomConflict (room_id,check_in,check_out) {
        const [rows] = await db.query(` SELECT * FROM bookings  WHERE room_id = ?  AND ( (check_in_date <= ? AND check_out_date > ?) OR (check_in_date < ? AND check_out_date >= ?) )  AND booking_status IN ('pending', 'confirmed')`, [room_id, check_in, check_in, check_out, check_out]);
      return rows;
      },
      async getRoomBasePrice(room_id) {
          const [[row]] = await db.query('SELECT rt.base_price FROM rooms r join room_types rt ON r.room_type_id = rt.room_type_id WHERE r.room_id = ?',[room_id]);
          return row;
      },
      async getPromotion(promotion_id) {
      const [[row]] = await db.query(`
        SELECT * FROM promotions WHERE promotion_id = ?  AND is_active = TRUE   AND start_date <= NOW()  AND end_date >= NOW()`, [promotion_id]);
      return row;
    },async createBooking(data) {
      const {
        user_id, room_id, check_in_date, check_out_date,
        adults, children, total_price,
        guest_first_name, guest_last_name,
        guest_email, guest_phone,
        special_requests, promotion_id
      } = data;

      const [result] = await db.query(`
        INSERT INTO bookings 
        (user_id, room_id, check_in_date, check_out_date, adults, children, total_price, booking_status, payment_status, payment_method, guest_first_name, guest_last_name, guest_email, guest_phone, special_requests, promotion_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', 'online', ?, ?, ?, ?, ?, ?)
      `, [
        user_id, room_id, check_in_date, check_out_date, adults, children || 0, total_price,
        guest_first_name, guest_last_name, guest_email || '', guest_phone || '',
        special_requests || '', promotion_id || null
      ]);

      return result.insertId;
    },
  };
  module.exports = BookingModel;
