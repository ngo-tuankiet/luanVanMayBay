const express = require("express");
const router = express.Router();
const controller = require("../../controllers/admin/adminroomType.controller");
const { uploadMultiple, handleUploadError } = require("../../middlewares/multer.middleware");

// Xem danh sách
router.get("/", controller.getAllRoomTypes);

// Tạo mới loại phòng (có upload nhiều ảnh)
router.post("/", uploadMultiple, handleUploadError, controller.createRoomType);

// Cập nhật loại phòng (có thể upload ảnh mới)
router.put("/:id", uploadMultiple, handleUploadError, controller.updateRoomType);

// Xóa loại phòng
router.delete("/:id", controller.deleteRoomType);

module.exports = router;
