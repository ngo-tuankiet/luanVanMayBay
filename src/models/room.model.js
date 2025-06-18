const prisma = require("../config/prisma.config");
const { Prisma } = require("@prisma/client");

exports.findRoomByRoomTypeIdAndIsActiveTrue = (roomTypeId, roomIds) => {
  const hasRoomIds = roomIds && Array.isArray(roomIds) && roomIds.length > 0;
  if (hasRoomIds) {
    return prisma.rooms.findMany({
      where: {
        AND: {
          room_type_id: roomTypeId,
          is_active: true,
          room_id: {
            notIn: roomIds,
          },
        },
      },
      orderBy: [
        {
          room_id: "asc",
        },
      ],
    });
  }
  return prisma.rooms.findMany({
    where: {
      AND: {
        room_type_id: roomTypeId,
        is_active: true,
      },
    },
    orderBy: [
      {
        room_id: "asc",
      },
    ],
  });
};

exports.findFallbackRooms = (
  roomTypeId,
  roomQuantity,
  checkInDate,
  checkOutDate,
  userId,
  roomIds
) => {
  const hasRoomIds = roomIds && Array.isArray(roomIds) && roomIds.length > 0;
  if (hasRoomIds) {
    return prisma.$queryRaw`
    SELECT r.room_id
    FROM rooms r
    WHERE r.room_type_id = ${roomTypeId}
      AND r.is_active = TRUE
      AND r.room_id NOT IN (SELECT b.room_id
                            FROM bookings b
                            WHERE (b.check_in_date < ${checkOutDate} AND b.check_out_date > ${checkInDate})
                              AND b.booking_status IN ('pending', 'confirmed'))
      AND r.room_id NOT IN (SELECT rh.room_id
                            FROM room_hold rh
                            WHERE (rh.check_in_date < ${checkOutDate} AND rh.check_out_date > ${checkInDate})
                              AND NOT (
                              hold_by_id = ${userId}
                                OR (expired_at IS NOT NULL AND expired_at < NOW())
                              ))
    AND r.room_id NOT IN (${Prisma.join(roomIds)})
    ORDER BY r.floor, r.room_number
    LIMIT ${roomQuantity}
  `;
  }
  return prisma.$queryRaw`
    SELECT r.room_id
    FROM rooms r
    WHERE r.room_type_id = ${roomTypeId}
      AND r.is_active = TRUE
      AND r.room_id NOT IN (SELECT b.room_id
                            FROM bookings b
                            WHERE (b.check_in_date < ${checkOutDate} AND b.check_out_date > ${checkInDate})
                              AND b.booking_status IN ('pending', 'confirmed'))
      AND r.room_id NOT IN (SELECT rh.room_id
                            FROM room_hold rh
                            WHERE (rh.check_in_date < ${checkOutDate} AND rh.check_out_date > ${checkInDate})
                              AND NOT (
                              hold_by_id = ${userId}
                                OR (expired_at IS NOT NULL AND expired_at < NOW())
                              ))
    ORDER BY r.floor, r.room_number
    LIMIT ${roomQuantity}
  `;
};

exports.findRoomBasePrice = roomId => {
  return prisma.$queryRaw`
    SELECT rt.base_price
    FROM rooms r
           JOIN room_types rt ON r.room_type_id = rt.room_type_id
    WHERE r.room_id = ${roomId}
  `;
};
