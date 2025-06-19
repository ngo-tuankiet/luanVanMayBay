const prisma = require("../config/prisma.config");

exports.findHold = (roomId, checkInDate, checkOutDate, userId) => {
  return prisma.$queryRaw`
    SELECT *
    FROM room_hold
    WHERE room_id = room_id
      AND NOT (check_in_date < ${checkOutDate} AND check_out_date > ${checkOutDate})
      AND (
      hold_by_id = ${userId}
        OR (expired_at IS NOT NULL AND expired_at < NOW())
      )
  `;
};

exports.create = roomHold => {
  return prisma.room_hold.create({
    data: roomHold,
  });
};

exports.updateExpiredAt = data => {
  return prisma.room_hold.updateMany({
    where: {
      AND: {
        room_id: {
          in: data.roomIds,
        },
        check_in_date: data.checkInDate,
        check_out_date: data.checkOutDate,
        hold_by_id: data.userId,
      },
    },
    data: {
      expired_at: data.expiredAt,
    },
  });
};
