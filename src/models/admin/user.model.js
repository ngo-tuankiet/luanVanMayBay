const prisma = require("../../config/prisma.config");

exports.findAll = async (skip = 0, limit = 10, search = "") => {
  const where = {
  OR: [
    { email: { contains: search} },
    { first_name: { contains: search } },
    { last_name: { contains: search} },
  ],
};

  const [users, total] = await Promise.all([
    prisma.users.findMany({
      where,
      skip: Number(skip),
      take: Number(limit),
      orderBy: { user_id: "desc" },
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        address: true,
        date_of_birth: true,
        is_active: true,
        role: true,
        created_at: true,
        updated_at: true
      }
    }),
    prisma.users.count({ where }),
  ]);

  return { users, total };
};

exports.findById = userId => {
  return prisma.users.findUnique({
    where: { user_id: Number(userId) },
    select: {
      user_id: true,
      username: true,
      email: true,
      first_name: true,
      last_name: true,
      phone_number: true,
      address: true,
      date_of_birth: true,
      is_active: true,
      role: true,
      created_at: true,
      updated_at: true
    }
  });
};

exports.findByEmail = email => {
  return prisma.users.findUnique({
    where: { email },
    select: {
      user_id: true,
      username: true,
      email: true,
      first_name: true,
      last_name: true,
      phone_number: true,
      address: true,
      date_of_birth: true,
      is_active: true,
      role: true,
      created_at: true,
      updated_at: true
    }
  });
};

exports.create = data => {
  return prisma.users.create({
    data,
    select: {
      user_id: true,
      username: true,
      email: true,
      first_name: true,
      last_name: true,
      phone_number: true,
      address: true,
      date_of_birth: true,
      is_active: true,
      role: true,
      created_at: true,
      updated_at: true
    }
  });
};

exports.updateById = (id, data) => {
  return prisma.users.update({
    where: { user_id: Number(id) },
    data,
    select: {
      user_id: true,
      username: true,
      email: true,
      first_name: true,
      last_name: true,
      phone_number: true,
      address: true,
      date_of_birth: true,
      is_active: true,
      role: true,
      created_at: true,
      updated_at: true
    }
  });
};

exports.deleteById = id => {
  return prisma.users.delete({
    where: { user_id: Number(id) }
  });
};

exports.hasBookings = userId => {
  return prisma.bookings.findFirst({
    where: { user_id: Number(userId) ,
      booking_status: { in: ['pending', 'confirmed'] }
    }
  });
};
