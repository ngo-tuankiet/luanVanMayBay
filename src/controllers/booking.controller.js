const payOS = require("../config/payos.config");
const RoomModel = require("../models/room.model");
const BookingModel = require("../models/booking.model");
const UserModel = require("../models/user.model");
const PromotionModel = require("../models/promotion.model");
const ServiceModel = require("../models/service.model");
const BookingServiceModel = require("../models/bookingService.model");
const RoomHoldModel = require("../models/roomHold.model");
const OrderModel = require("../models/order.model");

exports.preview = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const {
      check_in_date,
      check_out_date,
      room_type_id,
      room_quantity,
      auto_assign_type = "smart"
    } = req.body;

    if (!check_in_date || !check_out_date || !room_type_id || !room_quantity) {
      return res.status(400).json({
        statusCode: 400,
        message: "Thiếu thông tin bắt buộc",
        data: null,
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(check_in_date) || !dateRegex.test(check_out_date)) {
      return res.status(400).json({
        statusCode: 400,
        message: "Định dạng ngày không hợp lệ, yêu cầu dạng YYYY-MM-DD",
        data: null,
      });
    }

    const startDate = new Date(check_in_date);
    const endDate = new Date(check_out_date);
    if (startDate > endDate) {
      return res.status(400).json({
        statusCode: 400,
        message: "Ngày bắt đầu không được lớn hơn ngày kết thúc",
        data: null,
      });
    }

    const bestRoomIds = [];

    for (let i = 0; i < room_quantity; i++) {
      let bestRoomId = await getBestRoomId(
        room_type_id,
        startDate,
        endDate,
        userId,
        bestRoomIds
      );

      if (!bestRoomId) {
        const fallBackRoomIds = await RoomModel.findFallbackRooms(
          room_type_id,
          1,
          check_in_date,
          check_out_date,
          userId,
          bestRoomIds
        );
        if (fallBackRoomIds.length === 0) {
          return res.status(409).json({
            statusCode: 409,
            message: "Không còn phòng khả dụng để giữ",
            data: null,
          });
        }
        bestRoomId = fallBackRoomIds[0].room_id;
      }

      bestRoomIds.push(bestRoomId);
    }

    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + 10);

    for (const roomId of bestRoomIds) {
      await RoomHoldModel.create({
        room_id: roomId,
        check_in_date: startDate,
        check_out_date: endDate,
        expired_at: expiredAt,
        hold_by_id: userId,
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: "Giữ phòng thành công",
      data: {
        room_ids: bestRoomIds,
        expired_at: expiredAt,
      },
    });
  } catch (error) {
    console.error("Lỗi preview:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

exports.confirm = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const user = await UserModel.findById(userId);

    const {
      check_in_date,
      check_out_date,
      room_type_id,
      room_quantity,
      adults,
      children,
      guest_first_name,
      guest_last_name,
      guest_email,
      guest_phone,
      special_requests,
      promotion_id,
      auto_assign_type,
      payment_method,
      cancel_url,
      return_url
    } = req.body;

    if (!check_in_date || !check_out_date || !room_type_id || !room_quantity || !payment_method) {
      return res.status(400).json({
        statusCode: 400,
        message: "Thiếu thông tin bắt buộc",
        data: null,
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(check_in_date) || !dateRegex.test(check_out_date)) {
      return res.status(400).json({
        statusCode: 400,
        message: "Định dạng ngày không hợp lệ",
        data: null,
      });
    }

    const startDate = new Date(check_in_date);
    const endDate = new Date(check_out_date);
    if (startDate > endDate) {
      return res.status(400).json({
        statusCode: 400,
        message: "Ngày bắt đầu không được lớn hơn ngày kết thúc",
        data: null,
      });
    }

    if (payment_method !== "cash" && payment_method !== "bank_transfer") {
      return res.status(400).json({
        statusCode: 400,
        message: "Phương thức thanh toán không hợp lệ",
        data: null,
      });
    }

    let order = await OrderModel.create({
      order_code: Number(String(new Date().getTime()).slice(-6)),
      user_id: userId,
      payment_method,
    });

    const initBooking = {
      user_id: userId,
      check_in_date: startDate,
      check_out_date: endDate,
      booking_status: "pending",
      guest_first_name: guest_first_name || user?.first_name,
      guest_last_name: guest_last_name || user?.last_name,
      guest_email: guest_email || user?.email,
      guest_phone: guest_phone || user?.phone_number,
      order_id: order.order_id,
      special_requests,
      promotion_id,
    };

    const bookingIds = [];
    const bookingResults = [];
    const bookingServiceIds = [];
    let amount = 0;

    for (let i = 0; i < room_quantity; i++) {
      let bestRoomId = await getBestRoomId(
        room_type_id,
        startDate,
        endDate,
        userId
      );

      if (!bestRoomId) {
        const fallback = await RoomModel.findFallbackRooms(
          room_type_id,
          1,
          check_in_date,
          check_out_date,
          userId
        );
        if (!fallback || fallback.length === 0) {
          await BookingModel.deleteByIdIn(bookingIds);
          await BookingServiceModel.deleteByIdIn(bookingServiceIds);
          await OrderModel.deleteById(order.order_id);
          return res.status(409).json({
            statusCode: 409,
            message: "Không còn phòng khả dụng để đặt",
            data: null,
          });
        }
        bestRoomId = fallback[0].room_id;
      }

      const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const [{ base_price }] = await RoomModel.findRoomBasePrice(bestRoomId);
      let totalPrice = base_price * nights;

      const promotions = await PromotionModel.findPromotionRoomTypeId(room_type_id);
      for (const promo of promotions) {
        if (promo.type_name === "Giảm giá phần trăm") {
          totalPrice -= Math.ceil((promo.discount_value * totalPrice) / 100);
        } else if (promo.type_name === "Giảm giá cố định") {
          totalPrice -= promo.discount_value;
        }
      }
      totalPrice = Math.max(0, totalPrice);

      const booking = {
        ...initBooking,
        room_id: bestRoomId,
        total_price: totalPrice,
      };
      const bookingResult = await BookingModel.create(booking);
      bookingIds.push(bookingResult.booking_id);
      bookingResults.push(bookingResult);

      let totalServicePrice = 0;

      // Gọi service nếu có
      if (Array.isArray(req.body.services)) {
        for (const s of req.body.services) {
          const serviceList = await ServiceModel.findByIdAndActive(s.service_id);
          if (!serviceList || serviceList.length === 0) continue;

          const service = serviceList[0];
          const bookingService = await BookingServiceModel.create({
            booking_id: bookingResult.booking_id,
            service_id: service.service_id,
            quantity: s.quantity,
            price: service.price,
          });
          bookingServiceIds.push(bookingService.booking_service_id);
          bookingResult.service = {
            service_id: service.service_id,
            service_name: service.service_name,
            quantity: bookingService.quantity,
            price: bookingService.price,
          };
          totalServicePrice += bookingService.quantity * bookingService.price;
        }
      }

      amount += totalPrice + totalServicePrice;
    }

    order.amount = amount;
    order = await OrderModel.update(order);

    if (payment_method === "cash") {
      return res.status(200).json({
        statusCode: 200,
        message: "Đặt phòng thành công",
        data: bookingResults,
      });
    } else if (payment_method === "bank_transfer") {
      const payOsBody = {
        orderCode: order.order_code,
        amount: parseFloat(order.amount),
        description: `Thanh toán ${order.order_code}`,
        cancelUrl: cancel_url,
        returnUrl: return_url,
      };
      try {
        const paymentLinkRes = await payOS.createPaymentLink(payOsBody);
        return res.status(200).json({
          statusCode: 200,
          message: "Tạo thanh toán thành công",
          data: paymentLinkRes,
        });
      } catch (error) {
        console.error("Lỗi tạo link thanh toán", error);
        return res.status(500).json({
          statusCode: 500,
          message: "Lỗi tạo link thanh toán",
          data: null,
        });
      }
    }
  } catch (error) {
    console.error("Lỗi confirm:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};




const getBestRoomId = async (
  roomTypeId,
  startDate,
  endDate,
  userId,
  roomIds
) => {
  let bestScore = 0;
  let bestRoomId = null;

  const roomActives = await RoomModel.findRoomByRoomTypeIdAndIsActiveTrue(
    roomTypeId,
    roomIds
  );

  for (const room of roomActives) {
    const roomHolds = await RoomHoldModel.findHold(
      room.room_id,
      startDate,
      endDate,
      userId
    );
    if (roomHolds.length > 0) {
      continue;
    }

    let score = 0;
    let isConflict = false;
    let bestGapStartTime = Infinity;
    let bestGapEndTime = Infinity;

    const checkDateBookings = await BookingModel.findCheckDateByRoomId(
      room.room_id
    );

    for (const booking of checkDateBookings) {
      const bInDate = new Date(booking.check_in_date);
      const bOutDate = new Date(booking.check_out_date);

      if (startDate < bOutDate && endDate > bInDate) {
        isConflict = true;
        break;
      }

      const gapStartTime = Math.abs(startDate - bOutDate);
      const gapEndTime = Math.abs(bInDate - endDate);

      if (gapStartTime <= bestGapStartTime) {
        bestGapStartTime = gapStartTime;
        score += 10;
      }
      if (gapEndTime <= bestGapEndTime) {
        bestGapEndTime = gapEndTime;
        score += 10;
      }
    }

    if (!isConflict && score > bestScore) {
      bestScore = score;
      bestRoomId = room.room_id;
    }
  }

  return bestRoomId;
};
