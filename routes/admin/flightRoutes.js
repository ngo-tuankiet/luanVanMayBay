// 📁 routes/admin/flightRoutes.js
const express = require('express');
const router = express.Router();
const flightController = require('../../controllers/admin/FlightController');
const { verifyToken, authorizeRoles } = require('../../middlewares/authMiddleware');

//
router.use(verifyToken, authorizeRoles('Admin'));

router.get('/', flightController.getAllFlights);

// ✅ Tạo mới chuyến bay
router.post('/', flightController.createFlight);

// ✅ Cập nhật chuyến bay theo ID
router.put('/:id', flightController.updateFlight);

// ✅ Xóa chuyến bay theo ID
router.delete('/:id', flightController.deleteFlight);

// ✅ Lấy chuyến bay theo mã code
router.get('/code/:code', flightController.getByFlightCode);

// ✅ Cập nhật chuyến bay theo mã code
router.put('/code/:code', flightController.updateByFlightCode);

// ✅ Xóa chuyến bay theo mã code
router.delete('/code/:code', flightController.deleteByFlightCode);

module.exports = router;
