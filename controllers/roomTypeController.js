const RoomTypeModel = require('../models/seachRoom');


exports.findAvailableRoomTypes = async (req, res) => {
  try {
    const {
      check_in_date,
      check_out_date,
      room_quantity,
      adults,
      children
    } = req.body;

    if (
      !check_in_date || !check_out_date ||
      !room_quantity || !adults ||
      room_quantity <= 0 || adults <= 0
    ) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Thiếu thông tin hoặc số phòng/số người không hợp lệ',
        data: null
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(check_in_date) || !dateRegex.test(check_out_date)) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Định dạng ngày không hợp lệ, yêu cầu dạng YYYY-MM-DD',
        data: null
      });
    }

    const availableRoomTypes = await RoomTypeModel.findAvailableRoomTypes(
      check_in_date,
      check_out_date,
      room_quantity,
      adults,
      children,
      req.user?.userId || null
    );

    return res.status(200).json({
      statusCode: 200,
      message: 'Danh sách loại phòng khả dụng',
      data: 
         availableRoomTypes
      
    });

  } catch (error) {
    console.error('Lỗi lấy loại phòng khả dụng:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Lỗi máy chủ',
      error: error.message
    });
  }
};
