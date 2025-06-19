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

exports.updateCancel = (orderCode, userId) => {
  return prisma.orders.updateMany({
    where: {
      AND: {
        order_code: orderCode,
        user_id: userId,
      },
    },
    data: {
      status: "cancelled",
      updated_by: new Date(),
    },
  });
};

exports.findByCodeAndUserId = (orderCode, userId) => {
  return prisma.orders.findMany({
    where: {
      AND: {
        order_code: orderCode,
        user_id: userId,
      },
    },
  });
};

exports.findExpiredBankTransfer = () => {
  return prisma.orders.findMany({
    where: {
      expired_at: {
        lt: new Date(),
      },
      payment_method: "bank_transfer",
      status: "pending",
    },
  });
};

exports.updateCancelByIds = orderIds => {
  return prisma.orders.updateMany({
    where: {
      order_id: {
        in: orderIds,
      },
    },
    data: {
      status: "cancelled",
      updated_by: new Date(),
    },
  });
};
