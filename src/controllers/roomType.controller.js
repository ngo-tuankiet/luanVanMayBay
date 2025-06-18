const RoomTypeModel = require("../models/roomType.model");
const PromotionModel = require("../models/promotion.model");
const { deleteFile } = require("../middlewares/multer.middleware");
const RoomTypeImageModel = require("../models/roomTypeImage.model");

exports.search = async (req, res) => {
  try {
    const { check_in_date, check_out_date, adult, children, quantity } =
      req.query;
    const userId = req.user?.userId;

    if (!check_in_date || !check_out_date) {
      return res.status(400).json({
        statusCode: 400,
        message: "Yêu cầu ngày bắt đầu, ngày kết thúc",
        data: null,
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(check_in_date) || !dateRegex.test(check_out_date)) {
      return res.status(400).json({
        statusCode: 400,
        message: "Định dạng ngày không hợp lệ, yêu cầu dạng YYYY-MM-DD",
        data: null,
      });
    }

    const startDate = new Date(check_in_date);
    const endDate = new Date(check_out_date);

    if (startDate > endDate) {
      return res.status(400).json({
        statusCode: 400,
        message: "Ngày bắt đầu không được lớn hơn ngày kết thúc",
        data: null,
      });
    }

    if (!adult || adult <= 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Yêu cầu nhập số lượng người lớn",
        data: null,
      });
    }

    if (children && children < 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Số lượng trẻ em không hợp lệ",
        data: null,
      });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Yêu cầu nhập số lượng phòng",
        data: null,
      });
    }

    const roomTypes = await RoomTypeModel.findAvailable(
      startDate,
      endDate,
      adult ? adult : 0,
      children ? children : 0,
      userId
    );

    const roomTypeRes = [];

    for (const roomType of roomTypes) {
      if (quantity && roomType.available_rooms < quantity) {
        continue;
      }

      // Lấy khuyến mãi phòng
      roomType.promotions = await PromotionModel.findPromotionRoomTypeId(
        roomType.room_type_id
      );

      // Lấy ảnh của phòng

      const images = await RoomTypeImageModel.findByRoomTypeIdOrderByDisplay(
        roomType.room_type_id
      );

      roomTypeRes.push({
        ...roomType,
        available_rooms: parseInt(roomType.available_rooms),
        images: images,
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: "Danh sách loại phòng khả dụng",
      data: roomTypeRes,
    });
  } catch (error) {
    console.error("Lỗi lấy loại phòng khả dụng: ", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

exports.uploadImages = async (req, res) => {
  try {
    const roomTypeId = parseInt(req.params.roomTypeId);

    // Kiểm tra room type có tồn tại không
    const roomType = await RoomTypeModel.findById(roomTypeId);

    if (!roomType) {
      // Xóa các file đã upload nếu room type không tồn tại
      if (req.files) {
        req.files.forEach(file => deleteFile(file.path));
      }
      return res.status(404).json({
        statusCode: 404,
        message: "Loại phòng không tồn tại",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Vui lòng chọn ít nhất một ảnh để upload",
      });
    }

    // Lấy thứ tự hiển thị tiếp theo
    const lastImage = await RoomTypeImageModel.findLastImage(roomTypeId);

    let nextOrder = lastImage ? lastImage.display_order + 1 : 1;

    // Tạo records cho các ảnh
    const imageRecords = req.files.map((file, index) => ({
      room_type_id: roomTypeId,
      image_url: `/api/uploads/room-types/${file.filename}`,
      image_name: file.originalname,
      image_size: file.size,
      display_order: nextOrder + index,
      is_primary: false,
    }));

    // Lưu vào database
    await RoomTypeImageModel.createMany(imageRecords);

    res.status(201).json({
      statusCode: 201,
      message: `Upload thành công ${req.files.length} ảnh`,
      data: null,
    });
  } catch (error) {
    // Xóa các file đã upload nếu có lỗi
    if (req.files) {
      req.files.forEach(file => deleteFile(file.path));
    }

    console.error("Lỗi upload ảnh:", error);
    res.status(500).json({
      statusCode: 500,
      message: "Lỗi server khi upload ảnh",
    });
  }
};
