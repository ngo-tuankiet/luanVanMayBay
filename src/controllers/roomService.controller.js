const RoomServiceModel = require("../models/service.model");

exports.getAdditionalServices = async (req, res) => {
  try {
    const { room_type_id } = req.params;

    if (!room_type_id) {
      return res.status(400).json({
        statusCode: 400,
        message: "Thiếu room_type_id",
        data: null,
      });
    }

    const services = await RoomServiceModel.findAdditionalByRoomTypeId(room_type_id);

    const result = services.map((item) => ({
      service_id: item.service_id,
      service_name: item.service.service_name,
      price: item.service.price,
      description: item.service.description,
      unit: item.service.unit,
    }));

    return res.status(200).json({
      statusCode: 200,
      message: "Danh sách dịch vụ thêm",
      data: {
        services: result,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy dịch vụ thêm:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Lỗi máy chủ",
      data: null,
    });
  }
};
