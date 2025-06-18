const prisma = require("../../config/prisma.config");

exports.findAll = async (
  skip = 0,
  take = 10,
  { search = "", typeId, status, isActive } = {}
) => {
  const where = {
    AND: [
      search
        ? { room_number: { contains: search } }
        : {},
      typeId ? { room_type_id: Number(typeId) } : {},
      status ? { status } : {},
      isActive === undefined ? {} : { is_active: !!isActive },
    ],
  };

  const [rooms, total] = await Promise.all([
    prisma.rooms.findMany({
      where,
      skip,
      take,
      orderBy: { room_id: "desc" },
      include: { room_type: true },
    }),
    prisma.rooms.count({ where }),
  ]);

  return { rooms, total };
};

exports.findById = id =>
  prisma.rooms.findUnique({
    where: { room_id: Number(id) },
    include: { room_types: true },
  });

exports.findByRoomNumber = roomNumber =>
  prisma.rooms.findFirst({
    where: { room_number: roomNumber },
  });

exports.create = data => prisma.rooms.create({ data });

exports.updateById = (id, data) =>
  prisma.rooms.update({
    where: { room_id: Number(id) },
    data,
  });

exports.deleteById = id =>
  prisma.rooms.delete({
    where: { room_id: Number(id) },
  });

exports.hasBookings = roomId =>
  prisma.bookings.findFirst({
    where: {
      room_id: Number(roomId),
      booking_status: { in: ["pending", "confirmed"] },
    },
  });
