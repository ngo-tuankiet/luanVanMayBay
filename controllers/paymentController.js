const moment = require('moment');
const querystring = require('qs');
const crypto = require('crypto');

const db = require('../config/db');
const BookingModel = require('../models/bookingModel');

exports.createPaymentUrl = async (req, res) => {
  const { booking_id, booking_group_id, amount } = req.body;

  if ((!booking_id && !booking_group_id) || !amount) {
    return res.status(400).json({
      statusCode: 400,
      message: 'Thiếu thông tin booking_id hoặc booking_group_id hoặc amount',
      data: null
    });
  }

  let txnRef = '';
  let orderInfo = '';

  // Xử lý booking_group_id
  if (booking_group_id) {
    const [[group]] = await db.query(`SELECT * FROM booking_groups WHERE booking_group_id = ?`, [booking_group_id]);

    if (!group) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Booking group không tồn tại',
        data: null
      });
    }

    if (group.payment_status !== 'pending') {
      return res.status(400).json({
        statusCode: 400,
        message: 'Booking group đã được thanh toán hoặc không hợp lệ',
        data: null
      });
    }

    txnRef = booking_group_id + '-' + moment().format('YYYYMMDDHHmmss');
    orderInfo = `Thanh toan nhom don hang ${booking_group_id}`;
  }
  // Xử lý booking_id
  else if (booking_id) {
    const [[booking]] = await db.query(`SELECT * FROM bookings WHERE booking_id = ?`, [booking_id]);

    if (!booking) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Booking không tồn tại',
        data: null
      });
    }

    if (booking.payment_status !== 'pending') {
      return res.status(400).json({
        statusCode: 400,
        message: 'Booking đã được thanh toán hoặc không hợp lệ',
        data: null
      });
    }

    txnRef = booking_id + '-' + moment().format('YYYYMMDDHHmmss');
    orderInfo = `Thanh toan don hang ${booking_id}`;
  }

  // IP Address chuẩn
  let ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
  if (ipAddr === '::1') ipAddr = '127.0.0.1';

  // VNPAY Config
  const vnp_TmnCode = process.env.VNP_TMN_CODE;
  const vnp_HashSecret = process.env.VNP_HASH_SECRET;
  const vnp_Url = process.env.VNP_URL;
  const vnp_ReturnUrl = process.env.VNP_RETURN_URL;
console.log('>>> DEBUG VNP_HASH_SECRET:', vnp_HashSecret);
console.log('>>> DEBUG VNP_HASH_SECRET length:', vnp_HashSecret.length);
  const createDate = moment().format('YYYYMMDDHHmmss');

  // Build params
  let vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: vnp_TmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: amount * 100,
    vnp_ReturnUrl: vnp_ReturnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate
  };

  // Sort params
  vnp_Params = sortObject(vnp_Params);

  // DEBUG LOG
  console.log('>>> DEBUG CREATE: Params to be signed:');
  console.log(vnp_Params);

  const signData = querystring.stringify(vnp_Params, { encode: false });

  console.log('>>> DEBUG CREATE: signData string:');
  console.log(signData);

  if (!vnp_HashSecret) {
    console.error('>>> ERROR: VNP_HASH_SECRET is undefined !!!');
  }

  const hmac = crypto.createHmac('sha512', vnp_HashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  console.log('>>> DEBUG CREATE: signed hash:');
  console.log(signed);

  vnp_Params['vnp_SecureHash'] = signed;

  // Build full payment URL
  const paymentUrl = vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: true });

  console.log('>>> DEBUG CREATE: FULL PAYMENT URL:');
  console.log(paymentUrl);

  return res.status(200).json({
    statusCode: 200,
    message: 'Tạo URL thanh toán thành công',
    data: { paymentUrl }
  });
};

exports.vnpayReturn = async (req, res) => {
  const vnp_Params = req.query;
  const secureHash = vnp_Params['vnp_SecureHash'];

  delete vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHashType'];

  vnp_Params = sortObject(vnp_Params);

  // DEBUG LOG RETURN
  console.log('>>> DEBUG RETURN: Params to be signed:');
  console.log(vnp_Params);

  const signData = querystring.stringify(vnp_Params, { encode: false });

  console.log('>>> DEBUG RETURN: signData string:');
  console.log(signData);

  const hmac = crypto.createHmac('sha512', process.env.VNP_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  console.log('>>> DEBUG RETURN: signed hash:');
  console.log(signed);

  console.log('>>> DEBUG RETURN: vnp_SecureHash from request:');
  console.log(secureHash);

  if (secureHash === signed) {
    const responseCode = vnp_Params['vnp_ResponseCode'];
    const amount = vnp_Params['vnp_Amount'] / 100;
    const idPart = vnp_Params['vnp_TxnRef'].split('-')[0];

    if (responseCode === '00') {
      const [[group]] = await db.query(
        `SELECT * FROM booking_groups WHERE booking_group_id = ?`,
        [idPart]
      );

      if (group) {
        await db.query(
          `UPDATE booking_groups SET payment_status = 'paid' WHERE booking_group_id = ?`,
          [idPart]
        );

        await db.query(
          `UPDATE bookings SET booking_status = 'confirmed', payment_status = 'paid', hold_expired_at = NULL WHERE booking_group_id = ?`,
          [idPart]
        );

        return res.status(200).json({
          statusCode: 200,
          message: 'Thanh toán group thành công',
          data: {
            booking_group_id: idPart,
            amount
          }
        });
      } else {
        await db.query(
          `UPDATE bookings SET booking_status = 'confirmed', payment_status = 'paid', hold_expired_at = NULL WHERE booking_id = ?`,
          [idPart]
        );

        return res.status(200).json({
          statusCode: 200,
          message: 'Thanh toán booking thành công',
          data: {
            booking_id: idPart,
            amount
          }
        });
      }
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: 'Thanh toán thất bại',
        data: {
          id: idPart,
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

  // DEBUG LOG IPN
  console.log('>>> DEBUG IPN: Params to be signed:');
  console.log(vnp_Params);

  const signData = querystring.stringify(vnp_Params, { encode: false });

  console.log('>>> DEBUG IPN: signData string:');
  console.log(signData);

  const hmac = crypto.createHmac('sha512', process.env.VNP_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  console.log('>>> DEBUG IPN: signed hash:');
  console.log(signed);

  console.log('>>> DEBUG IPN: vnp_SecureHash from request:');
  console.log(secureHash);

  if (secureHash === signed) {
    const responseCode = vnp_Params['vnp_ResponseCode'];
    const amount = vnp_Params['vnp_Amount'] / 100;
    const idPart = vnp_Params['vnp_TxnRef'].split('-')[0];

    if (responseCode === '00') {
      const [[group]] = await db.query(
        `SELECT * FROM booking_groups WHERE booking_group_id = ?`,
        [idPart]
      );

      if (group) {
        await db.query(
          `UPDATE booking_groups SET payment_status = 'paid' WHERE booking_group_id = ?`,
          [idPart]
        );

        await db.query(
          `UPDATE bookings SET booking_status = 'confirmed', payment_status = 'paid', hold_expired_at = NULL WHERE booking_group_id = ?`,
          [idPart]
        );

        return res.status(200).send('{"RspCode":"00","Message":"Confirm Success (Group)"}');
      } else {
        await db.query(
          `UPDATE bookings SET booking_status = 'confirmed', payment_status = 'paid', hold_expired_at = NULL WHERE booking_id = ?`,
          [idPart]
        );

        return res.status(200).send('{"RspCode":"00","Message":"Confirm Success (Booking)"}');
      }
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
