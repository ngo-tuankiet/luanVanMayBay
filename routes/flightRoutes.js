// routes/flightRoutes.js
const express = require("express");
const router = express.Router();
const flightController = require("../controllers/flightController");
const { verifyToken, authorizeRoles } = require("../middlewares/authMiddleware");

// Các endpoint dưới đây chỉ cho phép Admin và Agent
router.get("/", verifyToken, authorizeRoles("Admin", "Agent"), flightController.getAllFlights);
router.get("/:id", verifyToken, authorizeRoles("Admin", "Agent"), flightController.getFlightById);
router.post("/", verifyToken, authorizeRoles("Admin", "Agent"), flightController.createFlight);
router.put("/:id", verifyToken, authorizeRoles("Admin", "Agent"), flightController.updateFlight);
router.delete("/:id", verifyToken, authorizeRoles("Admin", "Agent"), flightController.deleteFlight);

module.exports = router;
