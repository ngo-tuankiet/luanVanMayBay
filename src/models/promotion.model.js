const prisma = require("../config/prisma.config");

exports.findPromotionRoomTypeId = roomTypeId => {
  return prisma.$queryRaw`
    SELECT p.discount_value, pt.promotion_type_id, pt.type_name
    FROM room_promotions rp
           JOIN room_types rt ON rp.room_type_id = rt.room_type_id
           JOIN promotions p ON rp.promotion_id = p.promotion_id
           JOIN promotion_types pt ON p.promotion_type_id = pt.promotion_type_id
      AND rt.room_type_id = ${roomTypeId}
      AND p.is_active = TRUE
      AND p.start_date <= NOW()
      AND p.end_date >= NOW()
  `;
};
