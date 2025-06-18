const prisma = require("../config/prisma.config");

exports.findCheckDateByRoomId = roomId => {
  return prisma.bookings.findMany({
    select: {
      check_in_date: true,
      check_out_date: true,
    },
    where: {
      AND: {
        room_id: roomId,
        booking_status: {
          in: ["pending", "confirmed"],
        },
      },
    },
  });
};

exports.create = booking => {
  return prisma.bookings.create({
    data: booking,
  });
};

exports.deleteByIdIn = bookingIds => {
  return prisma.bookings.deleteMany({
    where: {
      booking_id: {
        in: bookingIds,
      },
    },
  });
};
