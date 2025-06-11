const express = require('express');
const router = express.Router();
const roomTypeController = require('../controllers/roomTypeController');

router.post('/room-types', roomTypeController.findAvailableRoomTypes);


module.exports = router;
