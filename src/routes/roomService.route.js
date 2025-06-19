const express = require("express");
const router = express.Router();
const RoomServiceController = require("../controllers/roomService.controller");

router.get("/room-types/:room_type_id/services", RoomServiceController.getAdditionalServices);

module.exports = router;
