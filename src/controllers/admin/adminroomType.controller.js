const RoomTypeModel = require("../../models/admin/roomType.model");

exports.getAllRoomTypes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const result = await RoomTypeModel.findAll(Number(page), Number(limit), search);

    const baseUrl = `${req.protocol}://${req.get("host")}/uploads`;
    result.room_types = result.room_types.map((rt) => {
      rt.room_type_images = rt.room_type_images.map((img) => ({
        ...img,
        image_url: `${baseUrl}/${img.image_url}`,
      }));
      return rt;
    });

    res.json({ statusCode: 200, message: "Thành công", data: result });
  } catch (err) {
    res.status(500).json({ statusCode: 500, message: err.message });
  }
};

exports.createRoomType = async (req, res) => {
  try {
    const {
      type_name, description, base_price, max_occupancy,
      max_adult, max_children, service_ids, promotion_ids
    } = req.body;

    const data = {
      type_name: type_name?.trim(),
      description: description?.trim() || "",
      base_price: Number(base_price),
      max_occupancy: Number(max_occupancy),
      max_adult: max_adult ? Number(max_adult) : null,
      max_children: max_children ? Number(max_children) : null,
    };

    const roomType = await RoomTypeModel.create(data, req.files);

    if (service_ids) {
      const services = typeof service_ids === "string" ? JSON.parse(service_ids) : service_ids;
      await RoomTypeModel.assignServices(roomType.room_type_id, services);
    }

    if (promotion_ids) {
      const promotions = typeof promotion_ids === "string" ? JSON.parse(promotion_ids) : promotion_ids;
      await RoomTypeModel.assignPromotions(roomType.room_type_id, promotions);
    }

    res.status(201).json({ statusCode: 201, message: "Tạo thành công", data: roomType });
  } catch (err) {
    res.status(500).json({ statusCode: 500, message: err.message });
  }
};

exports.updateRoomType = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      type_name, description, base_price, max_occupancy,
      max_adult, max_children, service_ids, promotion_ids
    } = req.body;

    const data = {};
    if (type_name) data.type_name = type_name;
    if (description !== undefined) data.description = description;
    if (base_price) data.base_price = Number(base_price);
    if (max_occupancy) data.max_occupancy = Number(max_occupancy);
    if (max_adult !== undefined) data.max_adult = Number(max_adult);
    if (max_children !== undefined) data.max_children = Number(max_children);

    const updated = await RoomTypeModel.update(id, data, req.files);

    if (service_ids) {
      const services = typeof service_ids === "string" ? JSON.parse(service_ids) : service_ids;
      await RoomTypeModel.assignServices(id, services);
    }

    if (promotion_ids) {
      const promotions = typeof promotion_ids === "string" ? JSON.parse(promotion_ids) : promotion_ids;
      await RoomTypeModel.assignPromotions(id, promotions);
    }

    res.json({ statusCode: 200, message: "Cập nhật thành công", data: updated });
  } catch (err) {
    res.status(500).json({ statusCode: 500, message: err.message });
  }
};

exports.deleteRoomType = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const success = await RoomTypeModel.delete(id);
    if (!success) {
      return res.status(400).json({ statusCode: 400, message: "Loại phòng đang được sử dụng" });
    }
    res.json({ statusCode: 200, message: "Đã xoá loại phòng" });
  } catch (err) {
    res.status(500).json({ statusCode: 500, message: err.message });
  }
};
