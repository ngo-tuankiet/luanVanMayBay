const prisma = require("../config/prisma.config");

exports.create = bookingService => {
  return prisma.booking_services.create({
    data: bookingService,
  });
};

exports.deleteByIdIn = bookingServiceIds => {
  return prisma.booking_services.deleteMany({
    where: {
      booking_service_id: {
        in: bookingServiceIds,
      },
    },
  });
};
