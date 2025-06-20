const prisma = require("../../config/prisma.config");

exports.findAll = async (
  skip = 0,
  take = 10,
  { search = "", typeId, status, isActive } = {}
) => {
  const where = {
    AND: [
      search ? { room_number: { contains: search } } : {},
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
      include: {
        room_type: {
          include: {
            room_type_images: {
              where: { is_primary: true },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.rooms.count({ where }),
  ]);

  return { rooms, total };
};

exports.checkRoomTypeExists = async (room_type_id) => {
  return prisma.room_types.findUnique({
    where: { room_type_id: Number(room_type_id) },
  });
};
exports.findById = id =>
  prisma.rooms.findUnique({
    where: { room_id: Number(id) },
    include: { room_type: true },
  });

exports.findByRoomNumber = roomNumber =>
  prisma.rooms.findFirst({
    where: { room_number: roomNumber },
  });

exports.checkRoomTypeExists = room_type_id => {
  return prisma.room_types.findFirst({ where: { room_type_id } });
};

exports.create = async (data) => {
  return prisma.rooms.create({
    data: {
      room_number: data.room_number,
      room_type_id: Number(data.room_type_id),
      floor: data.floor,
      status: data.status || "available",
      is_active: data.is_active ?? true,
    },
  });
};

exports.updateById = async (id, data) => {
  return prisma.rooms.update({
    where: { room_id: Number(id) },
    data: {
      room_number: data.room_number,
      room_type_id: data.room_type_id !== undefined ? Number(data.room_type_id) : undefined,
      floor: data.floor,
      status: data.status,
      is_active: data.is_active,
    },
  });
};

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