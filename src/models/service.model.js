const prisma = require("../config/prisma.config");

exports.findByIdAndActive = serviceId => {
  return prisma.services.findMany({
    where: {
      AND: {
        service_id: serviceId,
        is_active: true,
      },
    },
  });
};
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