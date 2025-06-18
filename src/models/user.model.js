const prisma = require("../config/prisma.config");

exports.findById = userId => {
  return prisma.users.findUnique({
    where: {
      user_id: userId,
    },
  });
};
