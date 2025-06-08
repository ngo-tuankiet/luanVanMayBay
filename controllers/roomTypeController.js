const RoomTypeModel = require('../models/seachRoom');

exports.getAvailableRoomTypes = async (req, res) => {
  try {
    const { check_in_date, check_out_date, room_quantity, adults, children } = req.body;
    const user_id = req.user?.userId || null; 
    const result = await RoomTypeModel.findAvailableRoomTypes(
      check_in_date,
      check_out_date,
      room_quantity,
      adults,
      children,
      user_id
    );

    res.status(200).json({
      statusCode: 200,
      message: "Danh sách loại phòng còn trống",
      data: result
    });
  } catch (err) {
    res.status(500).json({
      statusCode: 500,
      message: "Lỗi máy chủ",
      error: err.message
    });
  }
};
