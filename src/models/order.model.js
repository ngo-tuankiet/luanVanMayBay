const prisma = require("../config/prisma.config");

exports.create = order => {
  return prisma.orders.create({
    data: order,
  });
};

exports.update = order => {
  return prisma.orders.update({
    where: {
      order_id: order.order_id,
    },
    data: {
      ...order,
      updated_by: new Date(),
    },
  });
};

exports.updateByCode = (orderCode, order) => {
  return prisma.orders.update({
    where: {
      order_code: orderCode,
    },
    data: {
      ...order,
      updated_by: new Date(),
    },
  });
};

exports.deleteById = orderId => {
  return prisma.orders.delete({
    where: {
      order_id: orderId,
    },
  });
};

exports.findByCode = orderCode => {
  return prisma.orders.findUnique({
    where: {
      order_code: orderCode,
    },
  });
};
