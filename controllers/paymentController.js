const moment = require('moment');
const querystring = require('qs');
const crypto = require('crypto');

const db = require('../config/db');
const BookingModel = require('../models/bookingModel'); 

exports.createPaymentUrl = async (req, res) => {
  const { booking_id, amount } = req.body;

  if (!booking_id || !amount) {
    return res.status(400).json({
      statusCode: 400,
      message: 'Thiếu thông tin booking_id hoặc amount',
      data: null
    });
  }

  const vnp_TmnCode = process.env.VNP_TMN_CODE;
  const vnp_HashSecret = process.env.VNP_HASH_SECRET;
  const vnp_Url = process.env.VNP_URL;
  const vnp_ReturnUrl = process.env.VNP_RETURN_URL;

  const date = moment().format('YYYYMMDDHHmmss');
  const createDate = date;
  const orderId = booking_id + '-' + date; // tạo orderId có thể trace được booking
  const ipAddr = req.ip;

  const tmnCode = vnp_TmnCode;
  const locale = 'vn';
  const currCode = 'VND';

  let vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: locale,
    vnp_CurrCode: currCode,
    vnp_TxnRef: orderId,
    vnp_OrderInfo: `Thanh toan don hang #${booking_id}`,
    vnp_OrderType: 'other',
    vnp_Amount: amount * 100,
    vnp_ReturnUrl: vnp_ReturnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate
  };

  vnp_Params = sortObject(vnp_Params);

  const signData = querystring.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac('sha512', vnp_HashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  vnp_Params['vnp_SecureHash'] = signed;

  const paymentUrl = vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: true });

  res.status(200).json({
    statusCode: 200,
    message: 'Tạo URL thanh toán thành công',
    data: {
      paymentUrl
    }
  });
};

exports.vnpayReturn = async (req, res) => {
  const vnp_Params = req.query;
  const secureHash = vnp_Params['vnp_SecureHash'];

  delete vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHashType'];

  vnp_Params = sortObject(vnp_Params);

  const signData = querystring.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac('sha512', process.env.VNP_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  if (secureHash === signed) {
    const responseCode = vnp_Params['vnp_ResponseCode'];
    const amount = vnp_Params['vnp_Amount'] / 100;
    const booking_id = vnp_Params['vnp_TxnRef'].split('-')[0];

    if (responseCode === '00') {
      await db.query(
        `UPDATE bookings SET booking_status = 'confirmed', payment_status = 'paid',  hold_expired_at = NULL WHERE booking_id = ?`,
        [booking_id]
      );

      return res.status(200).json({
        statusCode: 200,
        message: 'Thanh toán thành công',
        data: {
          booking_id,
          amount
        }
      });
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: 'Thanh toán thất bại',
        data: {
          booking_id,
          responseCode
        }
      });
    }
  } else {
    return res.status(400).json({
      statusCode: 400,
      message: 'Sai checksum',
      data: null
    });
  }
};

exports.vnpayIpn = async (req, res) => {
  const vnp_Params = req.query;
  const secureHash = vnp_Params['vnp_SecureHash'];

  delete vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHashType'];

  vnp_Params = sortObject(vnp_Params);

  const signData = querystring.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac('sha512', process.env.VNP_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  if (secureHash === signed) {
    const responseCode = vnp_Params['vnp_ResponseCode'];
    const amount = vnp_Params['vnp_Amount'] / 100;
    const booking_id = vnp_Params['vnp_TxnRef'].split('-')[0];

    if (responseCode === '00') {
      await db.query(
        `UPDATE bookings SET booking_status = 'confirmed', payment_status = 'paid' WHERE booking_id = ?`,
        [booking_id]
      );

      return res.status(200).send('{"RspCode":"00","Message":"Confirm Success"}');
    } else {
      return res.status(200).send('{"RspCode":"01","Message":"Payment failed"}');
    }
  } else {
    return res.status(200).send('{"RspCode":"97","Message":"Checksum failed"}');
  }
};

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}
