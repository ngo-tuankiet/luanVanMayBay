const prisma = require("../config/prisma.config");

exports.findLastImage = roomTypeId => {
  return prisma.room_type_images.findFirst({
    where: { room_type_id: roomTypeId },
    orderBy: { display_order: "desc" },
  });
};

exports.createMany = roomTypeImages => {
  return prisma.room_type_images.createMany({
    data: roomTypeImages,
  });
};

exports.findByRoomTypeIdOrderByDisplay = roomTypeId => {
  return prisma.room_type_images.findMany({
    where: { room_type_id: roomTypeId },
    orderBy: { display_order: "asc" },
  });
};
