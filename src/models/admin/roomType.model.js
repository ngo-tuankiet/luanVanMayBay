const prisma = require("../../config/prisma.config");

exports.findAll = async (page = 1, limit = 10, search = "") => {
  const skip = (page - 1) * limit;
  const where = search
    ? { type_name: { contains: search } }
    : {};

  const [total, room_types] = await Promise.all([
    prisma.room_types.count({ where }),
    prisma.room_types.findMany({
      where,
      skip,
      take: limit,
      orderBy: { room_type_id: "desc" },
      include: {
        room_type_images: true,
        room_services: { include: { service: true } },
        room_promotions: { include: { promotion: true } },
      },
    }),
  ]);

  return { total, room_types };
};

exports.create = async (data, files = []) => {
  const roomType = await prisma.room_types.create({ data });

  if (files.length) {
    await Promise.all(
      files.map((file, idx) =>
        prisma.room_type_images.create({
          data: {
            room_type_id: roomType.room_type_id,
            image_url: file.filename,
            image_name: file.originalname,
            image_size: file.size,
            is_primary: idx === 0,
          },
        })
      )
    );
  }

  return prisma.room_types.findUnique({
    where: { room_type_id: roomType.room_type_id },
    include: {
      room_type_images: true,
      room_services: { include: { service: true } },
      room_promotions: { include: { promotion: true } },
    },
  });
};

exports.update = async (id, data, files = []) => {
  await prisma.room_types.update({
    where: { room_type_id: id },
    data,
  });

  if (files.length) {
    await prisma.room_type_images.deleteMany({ where: { room_type_id: id } });
    await Promise.all(
      files.map((file, idx) =>
        prisma.room_type_images.create({
          data: {
            room_type_id: id,
            image_url: file.filename,
            image_name: file.originalname,
            image_size: file.size,
            is_primary: idx === 0,
          },
        })
      )
    );
  }

  return prisma.room_types.findUnique({
    where: { room_type_id: id },
    include: {
      room_type_images: true,
      room_services: { include: { service: true } },
      room_promotions: { include: { promotion: true } },
    },
  });
};

exports.delete = async (id) => {
  const rooms = await prisma.rooms.findMany({ where: { room_type_id: id } });
  const roomIds = rooms.map((r) => r.room_id);

  if (roomIds.length > 0) {
    const booking = await prisma.bookings.findFirst({
      where: {
        room_id: { in: roomIds },
        booking_status: { in: ["pending", "confirmed"] },
      },
    });
    if (booking) return false;
  }

  await prisma.room_services.deleteMany({ where: { room_type_id: id } });
  await prisma.room_promotions.deleteMany({ where: { room_type_id: id } });
  await prisma.room_type_images.deleteMany({ where: { room_type_id: id } });
  await prisma.room_types.delete({ where: { room_type_id: id } });

  return true;
};

exports.assignServices = async (room_type_id, service_ids) => {
  await prisma.room_services.deleteMany({ where: { room_type_id } });
  if (!Array.isArray(service_ids)) {
    throw new Error("service_ids must be an array of integers");
  }
  const data = service_ids.map((sid) => ({
    room_type_id,
    service_id: parseInt(sid), 
  }));
  await prisma.room_services.createMany({ data });
};


exports.assignPromotions = async (room_type_id, promotion_ids) => {
  await prisma.room_promotions.deleteMany({ where: { room_type_id } });
  const data = promotion_ids.map((pid) => ({ room_type_id, promotion_id: pid }));
  await prisma.room_promotions.createMany({ data });
};
