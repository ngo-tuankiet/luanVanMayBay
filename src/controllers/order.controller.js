const OrderModel = require("../models/order.model");
const BookingModel = require("../models/booking.model");
const payOS = require("../config/payos.config");

exports.cancel = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const order_code = parseInt(req.body.order_code);
    const orders = await OrderModel.findByCodeAndUserId(order_code, userId);
    if (orders.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "Đơn hàng không tồn tại",
        data: null,
      });
    }
    const orderId = orders[0].order_id;

    // Cập nhật trạng thái order
    await OrderModel.updateCancel(order_code, userId);

    // Cập nhật booking
    await BookingModel.updateCancelByOrderId(orderId);

    return res.status(200).json({
      statusCode: 200,
      message: "Huỷ đơn hàng thành công",
      data: null,
    });
  } catch (error) {
    console.log("Lỗi huỷ đơn hàng: ", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Lỗi huỷ đơn hàng",
      data: null,
    });
  }
};
