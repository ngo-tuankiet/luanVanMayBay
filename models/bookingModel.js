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
  const hold_expired_at = new Date(Date.now() + 20 * 60 * 1000); 

      const [result] = await db.query(`
        INSERT INTO bookings 
        (user_id, room_id, check_in_date, check_out_date, adults, children, total_price, booking_status, payment_status, payment_method, guest_first_name, guest_last_name, guest_email, guest_phone, special_requests, promotion_id,hold_expired_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', 'online', ?, ?, ?, ?, ?, ?,?)
      `, [
        user_id, room_id, check_in_date, check_out_date, adults, children || 0, total_price,
        guest_first_name, guest_last_name, guest_email || '', guest_phone || '',
        special_requests || '', promotion_id || null, hold_expired_at
      ]);

      return result.insertId;
    },
async getPromotionByRoomType(room_type_id) {
    const [[row]] = await db.query(`
      SELECT p.* FROM room_promotions rp
      JOIN promotions p ON rp.promotion_id = p.promotion_id
      WHERE rp.room_type_id = ? AND p.is_active = TRUE AND p.start_date <= NOW() AND p.end_date >= NOW()
      ORDER BY p.discount_value DESC
      LIMIT 1
    `, [room_type_id]);
    return row;
},

async getUserPromotion(user_promotion_id, user_id) {
    const [[row]] = await db.query(`
      SELECT up.*, p.* FROM user_promotions up
      JOIN promotions p ON up.promotion_id = p.promotion_id
      WHERE up.user_promotion_id = ? AND up.user_id = ? AND up.is_used = FALSE
      AND p.is_active = TRUE AND p.start_date <= NOW() AND p.end_date >= NOW()
      LIMIT 1
    `, [user_promotion_id, user_id]);
    return row;
},

async markUserPromotionUsed(user_promotion_id) {
    await db.query(`
      UPDATE user_promotions SET is_used = TRUE, used_at = NOW()
      WHERE user_promotion_id = ?
    `, [user_promotion_id]);
},
  async getRoomTypeBasePrice(room_type_id) {
    const [[row]] = await db.query(`
      SELECT base_price, type_name 
      FROM room_types 
      WHERE room_type_id = ? 
    `, [room_type_id]);
    return row;
},

async getRoomPromotion(room_type_id, room_promotion_id) {
    if (!room_promotion_id) return null;
    const [[row]] = await db.query(`
      SELECT p.* FROM room_promotions rp
      JOIN promotions p ON rp.promotion_id = p.promotion_id
      WHERE rp.room_type_id = ? AND rp.promotion_id = ?
      AND p.is_active = TRUE AND p.start_date <= NOW() AND p.end_date >= NOW()
      LIMIT 1
    `, [room_type_id, room_promotion_id]);
    return row;
},
async findFallbackRooms(room_type_id, room_quantity, check_in, check_out) {
    const [rooms] = await db.query(`
      SELECT r.room_id
      FROM rooms r
      WHERE r.room_type_id = ? AND r.is_active = TRUE AND r.room_id NOT IN (
        SELECT b.room_id FROM bookings b
        WHERE (b.check_in_date < ? AND b.check_out_date > ?) AND b.booking_status IN ('pending', 'confirmed')
      )
      ORDER BY r.floor, r.room_number
      LIMIT ?
    `, [room_type_id, check_out, check_in, room_quantity]);

    return rooms;
}
  };
  module.exports = BookingModel;
