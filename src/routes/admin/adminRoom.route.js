const express = require("express");
const router = express.Router();
const {
  getAllRooms,
  createRoom,
  updateRoom,
  deleteRoom,
} = require("../../controllers/admin/adminRoom.controller");

const { verifyToken, authorizeRoles } = require("../../middlewares/authMiddleware");

router.use(verifyToken, authorizeRoles("admin"));

router.get("/", getAllRooms);      // ?page=&limit=&search=&typeId=&status=&isActive=
router.post("/", createRoom);
router.put("/:id", updateRoom);
router.delete("/:id", deleteRoom);

module.exports = router;
