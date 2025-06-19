const signatureUtils = require("../utils/signature.util");
const OrderModel = require("../models/order.model");
const payOS = require("../config/payos.config");

exports.payOSWebhook = async (req, res) => {
  try {
    const { data, signature } = req.body;
    const { orderCode, code } = data;
    if (!signatureUtils.isValidData(data, signature)) {
      throw new Error("Chữ ký không hợp lệ");
    }
    if (code !== "00") {
      throw new Error("Giao dịch không thành công");
    }

    // Nếu không phải giao dịch mẫu
    if (
      signature !==
      "878a47327b36b0b8fb84dcf1ed6639921428041695cf48a155b5fb660bf920ae"
    ) {
      const order = await OrderModel.updateByCode(orderCode, {
        status: "confirmed",
        payment_status: "paid",
      });
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("Lỗi payOS Webhook", error);
    return res.status(200).json({
      success: true,
    });
  }
};

exports.confirmWebhook = async (req, res) => {
  try {
    const { webhook_url } = req.body;
    await payOS.confirmWebhook(webhook_url);

    return res.status(200).json({
      statusCode: 200,
      message: "Xác nhận webhook thành công ",
    });
  } catch (error) {
    console.error("Lỗi xác nhận webhook",error);
    return res.status(500).json({
      statusCode: 500,
      message: "Lỗi xác nhận webhook",error,
    });
  }
};
