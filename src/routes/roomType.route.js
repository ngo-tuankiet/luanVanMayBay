const express = require("express");
const router = express.Router();
const RoomTypeController = require("../controllers/roomType.controller");
const { verifyToken } = require("../middlewares/authMiddleware");
const {
  uploadMultiple,
  handleUploadError,
  deleteFile,
} = require("../middlewares/multer.middleware");

router.get("/", verifyToken, RoomTypeController.search);
router.post(
  "/:roomTypeId/images",
  verifyToken,
  uploadMultiple,
  handleUploadError,
  RoomTypeController.uploadImages
);

module.exports = router;
