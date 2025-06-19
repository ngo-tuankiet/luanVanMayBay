const prisma = require("../config/prisma.config");

exports.findAdditionalByRoomTypeId = async (room_type_id) => {
  return prisma.room_services.findMany({
    where: {
      room_type_id: Number(room_type_id),
      service: {
        service_type: "additional",
        is_active: true,
      },
    },
    include: {
      service: true,
    },
  });
};
