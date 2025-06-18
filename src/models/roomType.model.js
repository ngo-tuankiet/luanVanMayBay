const prisma = require("../config/prisma.config");

exports.findAvailable = (startDate, endDate, adult, children, userId) => {
  return prisma.$queryRaw`
    SELECT rt.room_type_id,
           rt.type_name,
           rt.description,
           rt.base_price,
           rt.max_adult,
           rt.max_children,
           COUNT(r.room_id) AS available_rooms
    FROM room_types rt
           JOIN rooms r ON r.room_type_id = rt.room_type_id
    WHERE r.is_active = TRUE
      AND ( rt.max_adult >= ${adult})
      AND ( rt.max_children >= ${children})
      AND r.room_id NOT IN (SELECT b.room_id
                            FROM bookings b
                            WHERE (b.check_in_date < ${endDate} AND b.check_out_date > ${startDate})
                              AND b.booking_status IN ('pending', 'confirmed'))
      AND r.room_id NOT IN (SELECT rh.room_id
                            FROM room_hold rh
                            WHERE (rh.check_in_date < ${endDate} AND rh.check_out_date > ${startDate})
                              AND NOT (
                              hold_by_id = ${userId}
                                OR (expired_at IS NOT NULL AND expired_at < NOW())
                              ))
    GROUP BY rt.room_type_id
  `;
};

exports.findById = roomTypeId => {
  return prisma.room_types.findUnique({
    where: {
      room_type_id: roomTypeId,
    },
  });
};
