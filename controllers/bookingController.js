const RoomModel = require('../models/roomModel');
const BookingModel = require('../models/bookingModel');
const db = require('../config/db');
const UserBookingModel = require('../models/userBookingModel');

exports.createSmartBooking = async (req, res) => {
  const userId = req.user?.userId;
  const { rooms, auto_assign_type } = req.body;

  if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
    return res.status(400).json({
      statusCode: 400,
      message: 'Danh sách phòng không hợp lệ',
      data: null
    });
  }

  try {
    if (rooms.length === 1 && auto_assign_type === 'smart') {
      const roomData = rooms[0];
      const {
        room_type_id, check_in_date, check_out_date,
        adults, children, guest_first_name, guest_last_name,
        guest_email, guest_phone, promotion_id, special_requests
      } = roomData;

      const room_id = await RoomModel.findBestFitSmart(room_type_id, check_in_date, check_out_date);
      if (!room_id) {
        return res.status(409).json({
          statusCode: 409,
          message: 'Không tìm được phòng phù hợp với thuật toán smart-fit',
          data: null
        });
      }

      const conflicts = await BookingModel.checkRoomConflict(room_id, check_in_date, check_out_date);
      if (conflicts.length > 0) {
        return res.status(409).json({
          statusCode: 409,
          message: `Phòng ${room_id} đã được đặt trong thời gian này`,
          data: null
        });
      }

      const room = await BookingModel.getRoomBasePrice(room_id);
      if (!room) {
        return res.status(404).json({
          statusCode: 404,
          message: `Phòng ID ${room_id} không tồn tại`,
          data: null
        });
      }

      const nights = Math.ceil((new Date(check_out_date) - new Date(check_in_date)) / (1000 * 60 * 60 * 24));
      let total_price = room.base_price * nights;

      if (promotion_id) {
        const promo = await BookingModel.getPromotion(promotion_id);
        if (promo) {
          if (promo.promotion_type_id === 1) total_price *= (1 - promo.discount_value / 100);
          else if (promo.promotion_type_id === 2) total_price -= promo.discount_value;
        }
      }

      const booking_id = await BookingModel.createBooking({
        user_id: userId, room_id, check_in_date, check_out_date,
        adults, children, total_price,
        guest_first_name, guest_last_name, guest_email, guest_phone,
        special_requests, promotion_id
      });

      return res.status(201).json({
        statusCode: 201,
        message: 'Đặt phòng thành công (smart-fit)',
        data: {
          booking_id,
          room_id,
          total_price
        }
      });
    }

    if (auto_assign_type === 'group') {
      const { room_type_id, check_in_date, check_out_date } = rooms[0];
      const result = await RoomModel.findRoomGroup(room_type_id, rooms.length, check_in_date, check_out_date);

      if (!result?.bestFit) {
        return res.status(409).json({
          statusCode: 409,
          message: 'Không tìm được cụm phòng phù hợp',
          data: {
            suggestions: result?.alternatives
          }
        });
      }

      for (let i = 0; i < rooms.length; i++) {
        rooms[i].room_id = result.bestFit[i];
      }
    }

    const createdBookings = [];

    for (const roomData of rooms) {
      const {
        room_id, check_in_date, check_out_date,
        adults, children, guest_first_name, guest_last_name,
        guest_email, guest_phone, promotion_id, special_requests
      } = roomData;

      const conflicts = await BookingModel.checkRoomConflict(room_id, check_in_date, check_out_date);
      if (conflicts.length > 0) {
        return res.status(409).json({
          statusCode: 409,
          message: `Phòng ${room_id} đã được đặt trong thời gian này`,
          data: null
        });
      }

      const room = await BookingModel.getRoomBasePrice(room_id);
      if (!room) {
        return res.status(404).json({
          statusCode: 404,
          message: `Phòng ID ${room_id} không tồn tại`,
          data: null
        });
      }

      const nights = Math.ceil((new Date(check_out_date) - new Date(check_in_date)) / (1000 * 60 * 60 * 24));
      let total_price = room.base_price * nights;

      if (promotion_id) {
        const promo = await BookingModel.getPromotion(promotion_id);
        if (promo) {
          if (promo.promotion_type_id === 1) total_price *= (1 - promo.discount_value / 100);
          else if (promo.promotion_type_id === 2) total_price -= promo.discount_value;
        }
      }

      const booking_id = await BookingModel.createBooking({
        user_id: userId, room_id, check_in_date, check_out_date,
        adults, children, total_price,
        guest_first_name, guest_last_name, guest_email, guest_phone,
        special_requests, promotion_id
      });

      createdBookings.push({ booking_id, room_id, total_price });
    }

    return res.status(201).json({
      statusCode: 201,
      message: 'Đặt phòng thành công',
      data: {
        bookings: createdBookings
      }
    });

  } catch (error) {
    console.error('Lỗi đặt phòng:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Đã xảy ra lỗi trong quá trình đặt phòng',
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
