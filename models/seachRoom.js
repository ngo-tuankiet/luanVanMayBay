
const db = require('../config/db');

exports.findAvailableRoomTypes = async (check_in_date, check_out_date, room_quantity, adults, children, user_id = null) => {
  const totalGuests = adults + children;

  const [rows] = await db.query(`
    SELECT 
      rt.room_type_id,
      rt.type_name,
      rt.description,
      rt.base_price,
      rt.max_occupancy,
      COUNT(r.room_id) AS available_rooms
    FROM room_types rt
    JOIN rooms r ON r.room_type_id = rt.room_type_id
    WHERE r.is_active = TRUE AND rt.max_occupancy >= ?
      AND r.room_id NOT IN (
        SELECT b.room_id
        FROM bookings b
        WHERE (b.check_in_date < ? AND b.check_out_date > ?)
          AND b.booking_status IN ('pending', 'confirmed')
      )
    GROUP BY rt.room_type_id
  `, [totalGuests,check_out_date, check_in_date]);

  const result = [];

  for (const row of rows) {
    const [roomPromotions] = await db.query(`
      SELECT p.promotion_id, p.promotion_name, pt.type_name AS promotion_type, p.discount_value
      FROM room_promotions rp
      JOIN promotions p ON rp.promotion_id = p.promotion_id
      JOIN promotion_types pt ON p.promotion_type_id = pt.promotion_type_id
      WHERE rp.room_type_id = ?
        AND p.is_active = TRUE
        AND p.start_date <= NOW()
        AND p.end_date >= NOW()
    `, [row.room_type_id]);

    let userPromotions = [];
    if (user_id) {
      const [userPromotionsRows] = await db.query(`
        SELECT p.promotion_id, p.promotion_name, pt.type_name AS promotion_type, p.discount_value
        FROM user_promotions up
        JOIN promotions p ON up.promotion_id = p.promotion_id
        JOIN promotion_types pt ON p.promotion_type_id = pt.promotion_type_id
        WHERE up.user_id = ?
          AND up.is_used = FALSE
          AND p.is_active = TRUE
          AND p.start_date <= NOW()
          AND p.end_date >= NOW()
      `, [user_id]);

      userPromotions = userPromotionsRows;
    }

    result.push({
      room_type: {
        room_type_id: row.room_type_id,
        type_name: row.type_name,
        description: row.description,
        base_price: row.base_price
      },
      available_rooms: row.available_rooms,
      room_promotions: roomPromotions,
      available_user_promotions: userPromotions
    });
  }

  return result;
};
