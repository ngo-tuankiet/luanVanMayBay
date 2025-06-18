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
