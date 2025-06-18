const RoomModel = require("../../models/admin/room.model");
const prisma = require("../../config/prisma.config");


exports.getAllRooms = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      typeId,
      status,
      isActive,
    } = req.query;
    const skip = (page - 1) * limit;

    const { rooms, total } = await RoomModel.findAll(skip, Number(limit), {
      search,
      typeId,
      status,
      isActive,
    });

    res.json({
      statusCode: 200,
      message: "Lấy danh sách phòng thành công",
      data: { total, rooms },
    });
  } catch (err) {
    res.status(500).json({ statusCode: 500, message: err.message });
  }
};
exports.createRoom = async (req, res) => {
  try {
    const {
      room_number,
      room_type_id,
      floor,
      status = "available",
      is_active = true,
    } = req.body;

    // Kiểm tra số phòng trùng
    const existing = await RoomModel.findByRoomNumber(room_number);
    if (existing) {
      return res.status(400).json({
        statusCode: 400,
        message: "Số phòng đã tồn tại",
      });
    }

    // Kiểm tra loại phòng tồn tại
    const checkRoomType = await prisma.room_types.findUnique({
      where: { room_type_id: Number(room_type_id) },
    });
    if (!checkRoomType) {
      return res.status(400).json({
        statusCode: 400,
        message: "Loại phòng không tồn tại",
      });
    }

    const room = await RoomModel.create({
      room_number,
      room_type_id,
      floor,
      status,
      is_active,
    });

    return res.status(201).json({
      statusCode: 201,
      message: "Tạo phòng thành công",
      data: room,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

exports.updateRoom = async (req, res) => {
  const { id } = req.params;
  try {
    const current = await RoomModel.findById(id);
    if (!current) {
      return res.status(404).json({
        statusCode: 404,
        message: "Không tìm thấy phòng",
      });
    }

    const { room_number, room_type_id } = req.body;

    // Kiểm tra trùng room_number
    if (
      room_number &&
      room_number !== current.room_number &&
      (await RoomModel.findByRoomNumber(room_number))
    ) {
      return res.status(400).json({
        statusCode: 400,
        message: "Số phòng đã tồn tại",
      });
    }

    // Nếu có truyền room_type_id thì kiểm tra tồn tại
    if (room_type_id !== undefined) {
      const exists = await prisma.room_types.findUnique({
        where: { room_type_id: Number(room_type_id) },
      });
      if (!exists) {
        return res.status(400).json({
          statusCode: 400,
          message: "Loại phòng không tồn tại",
        });
      }
    }

    const updated = await RoomModel.updateById(id, req.body);

    return res.json({
      statusCode: 200,
      message: "Cập nhật phòng thành công",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

exports.deleteRoom = async (req, res) => {
  const { id } = req.params;
  try {
    const room = await RoomModel.findById(id);
    if (!room)
      return res
        .status(404)
        .json({ statusCode: 404, message: "Không tìm thấy phòng" });

    const hasBooking = await RoomModel.hasBookings(id);
    if (hasBooking)
      return res.status(400).json({
        statusCode: 400,
        message: "Không thể xoá phòng đang được đặt",
      });

    await RoomModel.deleteById(id);
    res.json({ statusCode: 200, message: "Xoá phòng thành công" });
  } catch (err) {
    res.status(500).json({ statusCode: 500, message: err.message });
  }
};
