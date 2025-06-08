const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/create-url', paymentController.createPaymentUrl);
router.get('/vnpay-return', paymentController.vnpayReturn);
router.get('/vnpay-ipn', paymentController.vnpayIpn);

module.exports = router;
