const RoomModel = require('../models/roomModel');
const BookingModel = require('../models/bookingModel');
const db = require('../config/db');
const UserBookingModel = require('../models/userBookingModel');

exports.previewBooking = async (req, res) => {
  const userId = req.user?.userId;
  const {
    room_type_id, check_in_date, check_out_date,
    room_quantity, adults, children,
    user_promotion_id, selected_room_promotion_id
  } = req.body;

  if (!room_type_id || !check_in_date || !check_out_date || !room_quantity || !adults) {
    return res.status(400).json({
      statusCode: 400,
      message: 'Thiếu thông tin yêu cầu',
      data: null
    });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(check_in_date) || !dateRegex.test(check_out_date)) {
    return res.status(400).json({
      statusCode: 400,
      message: 'Định dạng ngày không hợp lệ, yêu cầu dạng YYYY-MM-DD',
      data: null
    });
  }

  try {
    const roomType = await BookingModel.getRoomTypeBasePrice(room_type_id);
    if (!roomType) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Loại phòng không tồn tại hoặc không hoạt động',
        data: null
      });
    }

    const nights = Math.ceil((new Date(check_out_date) - new Date(check_in_date)) / (1000 * 60 * 60 * 24));
    let total_price_before_discount = roomType.base_price * nights * room_quantity;
    let total_price_after_discount = total_price_before_discount;

    let roomPromotion = await BookingModel.getRoomPromotion(room_type_id, selected_room_promotion_id);

    let userPromotion = null;
    if (user_promotion_id && userId) {
      userPromotion = await BookingModel.getUserPromotion(user_promotion_id, userId);
      if (!userPromotion) {
        return res.status(400).json({
          statusCode: 400,
          message: 'Khuyến mãi khách hàng không hợp lệ',
          data: null
        });
      }
    }

    if (userPromotion) {
      if (userPromotion.promotion_type_id === 1) {
        total_price_after_discount *= (1 - userPromotion.discount_value / 100);
      } else if (userPromotion.promotion_type_id === 2) {
        total_price_after_discount -= userPromotion.discount_value;
      }
    } else if (roomPromotion) {
      if (roomPromotion.promotion_type_id === 1) {
        total_price_after_discount *= (1 - roomPromotion.discount_value / 100);
      } else if (roomPromotion.promotion_type_id === 2) {
        total_price_after_discount -= roomPromotion.discount_value;
      }
    }

    if (total_price_after_discount < 0) total_price_after_discount = 0;

    return res.status(200).json({
      statusCode: 200,
      message: 'Thông tin đặt phòng dự kiến',
      data: {
        room_type_id,
        room_type_name: roomType.type_name,
        check_in_date,
        check_out_date,
        room_quantity,
        adults,
        children,
        nights,
        base_price: roomType.base_price,
        total_price_before_discount,
        total_price_after_discount,
        room_promotion_applied: roomPromotion ? {
          promotion_id: roomPromotion.promotion_id,
          promotion_name: roomPromotion.promotion_name,
          promotion_type_id: roomPromotion.promotion_type_id,
          discount_value: roomPromotion.discount_value
        } : null,
        user_promotion_applied: userPromotion ? {
          user_promotion_id: userPromotion.user_promotion_id,
          promotion_id: userPromotion.promotion_id,
          promotion_name: userPromotion.promotion_name,
          promotion_type_id: userPromotion.promotion_type_id,
          discount_value: userPromotion.discount_value
        } : null
      }
    });

  } catch (error) {
    console.error('Lỗi preview booking:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Đã xảy ra lỗi trong quá trình xử lý',
      data: { error: error.message }
    });
  }
};


exports.getUserBookings = async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({
      statusCode: 401,
      message: 'Chưa đăng nhập',
      data: null
    });
  }

  try {
    const bookings = await UserBookingModel.getBookingsByUserId(userId);
    return res.status(200).json({
      statusCode: 200,
      message: 'Danh sách phòng đã đặt của bạn',
      data: bookings
    }); 
  } catch (error) {
    console.error('Lỗi lấy lịch sử đặt phòng:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Đã xảy ra lỗi máy chủ',
      data: { error: error.message }
    });
  }
};

exports.createSmartBooking = async (req, res) => {
  const userId = req.user?.userId;
  const { rooms } = req.body;

  if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
    return res.status(400).json({
      statusCode: 400,
      message: 'Danh sách phòng không hợp lệ',
      data: null
    });
  }

  const autoAssignType = (rooms.length === 1) ? 'smart' : 'group';

  try {
    // SMART
    if (autoAssignType === 'smart') {
      const roomData = rooms[0];
      const {
        room_type_id, check_in_date, check_out_date,
        adults, children, guest_first_name, guest_last_name,
        guest_email, guest_phone, user_promotion_id, room_promotion_id, special_requests
      } = roomData;

      // [AUTO-FILL GUEST INFO]
      const guestFirstName = guest_first_name || req.user?.first_name || '';
      const guestLastName = guest_last_name || req.user?.last_name || '';
      const guestEmail = guest_email || req.user?.email || '';
      const guestPhone = guest_phone || req.user?.phone_number || '';

      let room_id = await RoomModel.findBestFitSmart(room_type_id, check_in_date, check_out_date);

      if (!room_id) {
        const fallbackRooms = await BookingModel.findFallbackRooms(room_type_id, 1, check_in_date, check_out_date);
        if (fallbackRooms.length === 0) {
          return res.status(409).json({
            statusCode: 409,
            message: 'Không còn phòng khả dụng để đặt',
            data: null
          });
        }
        room_id = fallbackRooms[0].room_id;
      }

      const roomBase = await BookingModel.getRoomBasePrice(room_id);
      if (!roomBase) {
        return res.status(404).json({
          statusCode: 404,
          message: `Phòng ID ${room_id} không tồn tại`,
          data: null
        });
      }

      const nights = Math.ceil((new Date(check_out_date) - new Date(check_in_date)) / (1000 * 60 * 60 * 24));
      let total_price = roomBase.base_price * nights;
      let applied_promotion_id = null;

      if (user_promotion_id) {
        const userPromo = await BookingModel.getUserPromotion(user_promotion_id, userId || 0);
        if (userPromo) {
          applied_promotion_id = userPromo.promotion_id;
          if (userPromo.promotion_type_id === 1) total_price *= (1 - userPromo.discount_value / 100);
          else if (userPromo.promotion_type_id === 2) total_price -= userPromo.discount_value;
          await BookingModel.markUserPromotionUsed(user_promotion_id);
        }
      } else if (room_promotion_id) {
        const roomPromo = await BookingModel.getRoomPromotion(room_type_id, room_promotion_id);
        if (roomPromo) {
          applied_promotion_id = roomPromo.promotion_id;
          if (roomPromo.promotion_type_id === 1) total_price *= (1 - roomPromo.discount_value / 100);
          else if (roomPromo.promotion_type_id === 2) total_price -= roomPromo.discount_value;
        }
      }

      if (total_price < 0) total_price = 0;

      const booking_id = await BookingModel.createBooking({
        user_id: userId || null,
        room_id, check_in_date, check_out_date,
        adults, children, total_price,
        guest_first_name: guestFirstName,
        guest_last_name: guestLastName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        special_requests, promotion_id: applied_promotion_id
      });

      return res.status(201).json({
        statusCode: 201,
        message: 'Đặt phòng thành công (smart-fit)',
        data: { booking_id, room_id, total_price }
      });
    }

    // GROUP
   // GROUP
if (autoAssignType === 'group') {
  const { room_type_id, check_in_date, check_out_date } = rooms[0];
  const room_quantity = rooms.length;

  // [TẠO BOOKING GROUP TRƯỚC]
  const [groupResult] = await db.query(`
    INSERT INTO booking_groups (user_id, total_price, payment_status)
    VALUES (?, 0, 'pending')
  `, [userId]);

  const booking_group_id = groupResult.insertId;

  const result = await RoomModel.findRoomGroup(room_type_id, room_quantity, check_in_date, check_out_date);

  let room_ids = [];

  if (result?.bestFit) {
    room_ids = result.bestFit;
  } else {
    const fallbackRooms = await BookingModel.findFallbackRooms(room_type_id, room_quantity, check_in_date, check_out_date);
    if (fallbackRooms.length < room_quantity) {
      return res.status(409).json({
        statusCode: 409,
        message: 'Không đủ phòng khả dụng để fallback',
        data: { suggestions: result?.alternatives }
      });
    }
    room_ids = fallbackRooms.map(r => r.room_id);
  }

  const createdBookings = [];

  for (let i = 0; i < room_quantity; i++) {
    const roomData = rooms[i];
    const {
      check_in_date, check_out_date,
      adults, children, guest_first_name, guest_last_name,
      guest_email, guest_phone, user_promotion_id, room_promotion_id, special_requests
    } = roomData;

    // [AUTO-FILL GUEST INFO]
    const guestFirstName = guest_first_name || req.user?.first_name || '';
    const guestLastName = guest_last_name || req.user?.last_name || '';
    const guestEmail = guest_email || req.user?.email || '';
    const guestPhone = guest_phone || req.user?.phone_number || '';

    const room_id = room_ids[i];

    const conflicts = await BookingModel.checkRoomConflict(room_id, check_in_date, check_out_date);
    if (conflicts.length > 0) {
      return res.status(409).json({
        statusCode: 409,
        message: `Phòng ${room_id} đã được đặt trong thời gian này`,
        data: null
      });
    }

    const roomBase = await BookingModel.getRoomBasePrice(room_id);
    if (!roomBase) {
      return res.status(404).json({
        statusCode: 404,
        message: `Phòng ID ${room_id} không tồn tại`,
        data: null
      });
    }

    const nights = Math.ceil((new Date(check_out_date) - new Date(check_in_date)) / (1000 * 60 * 60 * 24));
    let total_price = roomBase.base_price * nights;
    let applied_promotion_id = null;

    if (user_promotion_id) {
      const userPromo = await BookingModel.getUserPromotion(user_promotion_id, userId || 0);
      if (userPromo) {
        applied_promotion_id = userPromo.promotion_id;
        if (userPromo.promotion_type_id === 1) total_price *= (1 - userPromo.discount_value / 100);
        else if (userPromo.promotion_type_id === 2) total_price -= userPromo.discount_value;
        await BookingModel.markUserPromotionUsed(user_promotion_id);
      }
    } else if (room_promotion_id) {
      const roomPromo = await BookingModel.getRoomPromotion(room_type_id, room_promotion_id);
      if (roomPromo) {
        applied_promotion_id = roomPromo.promotion_id;
        if (roomPromo.promotion_type_id === 1) total_price *= (1 - roomPromo.discount_value / 100);
        else if (roomPromo.promotion_type_id === 2) total_price -= roomPromo.discount_value;
      }
    }

    if (total_price < 0) total_price = 0;

    const booking_id = await BookingModel.createBooking({
      user_id: userId || null,
      room_id, check_in_date, check_out_date,
      adults, children, total_price,
      guest_first_name: guestFirstName,
      guest_last_name: guestLastName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      special_requests,
      promotion_id: applied_promotion_id,
      booking_group_id 
    });

    createdBookings.push({ booking_id, room_id, total_price });
  }

  
  const totalGroupPrice = createdBookings.reduce((sum, b) => sum + b.total_price, 0);

  await db.query(`
    UPDATE booking_groups SET total_price = ? WHERE booking_group_id = ?
  `, [totalGroupPrice, booking_group_id]);

  return res.status(201).json({
    statusCode: 201,
    message: 'Đặt phòng thành công (group-fit)',
    data: {
      booking_group_id,
      total_price: totalGroupPrice
    }
  });
}

  } catch (error) {
    console.error('Lỗi đặt phòng:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Đã xảy ra lỗi trong quá trình đặt phòng',
      data: { error: error.message }
    });
  }
};

