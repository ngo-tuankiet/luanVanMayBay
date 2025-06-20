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
    const { check_in_date, check_out_date, rooms } = req.body;

    if (!check_in_date || !check_out_date) {
      return res.status(400).json({
        statusCode: 400,
        message: "Yêu cầu ngày bắt đầu, ngày kết thúc",
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

    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Danh sách phòng không hợp lệ",
        data: null,
      });
    }

    const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const roomTypePrices = [];
    const roomIdsToHold = [];

    for (const { room_type_id, quantity } of rooms) {
      let total_price = 0;

      for (let i = 0; i < quantity; i++) {
        let bestRoomId = await getBestRoomId(
          room_type_id,
          startDate,
          endDate,
          userId,
          roomIdsToHold
        );

        if (!bestRoomId) {
          const fallBackRoomIds = await RoomModel.findFallbackRooms(
            room_type_id,
            1,
            check_in_date,
            check_out_date,
            userId,
            roomIdsToHold
          );
          if (fallBackRoomIds.length === 0) {
            return res.status(409).json({
              statusCode: 409,
              message: "Không còn phòng khả dụng để đặt",
              data: null,
            });
          }
          bestRoomId = fallBackRoomIds[0].room_id;
        }

        const basePriceRow = await RoomModel.findRoomBasePrice(bestRoomId);
        const base_price = basePriceRow[0]?.base_price || 0;
        total_price += base_price * nights;

        roomIdsToHold.push(bestRoomId);
      }

      roomTypePrices.push({
        room_type_id,
        quantity,
        total_price
      });
    }

    let currentTime = new Date();
    currentTime.setMinutes(currentTime.getMinutes() + 10);
    for (const roomId of roomIdsToHold) {
      await RoomHoldModel.create({
        room_id: roomId,
        check_in_date: startDate,
        check_out_date: endDate,
        expired_at: currentTime,
        hold_by_id: userId,
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: "Giữ phòng thành công",
      data: {
        check_in_date,
        check_out_date,
        total_nights: nights,
        room_types: roomTypePrices
      },
    });
  } catch (error) {
    console.error("Lỗi lấy giữ phòng: ", error);
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
      guest_first_name,
      guest_last_name,
      guest_email,
      guest_phone,
      payment_method,
      cancel_url,
      return_url,
      rooms,
    } = req.body;

    if (!check_in_date || !check_out_date) {
      return res.status(400).json({
        statusCode: 400,
        message: "Yêu cầu ngày bắt đầu, ngày kết thúc",
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

    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Danh sách phòng không hợp lệ",
        data: null,
      });
    }

    if (!payment_method) {
      return res.status(400).json({
        statusCode: 400,
        message: "Vui lòng chọn phương thức thanh toán",
        data: null,
      });
    }

    if (payment_method !== "cash" && payment_method !== "bank_transfer") {
      return res.status(400).json({
        statusCode: 400,
        message: "hương thức thanh toán không hợp lệ",
        data: null,
      });
    }

    // Hạn thanh toán 10 phút
    let currentTime = new Date();
    currentTime.setMinutes(currentTime.getMinutes() + 10);

    let order = await OrderModel.create({
      order_code: Number(String(new Date().getTime()).slice(-6)),
      user_id: userId,
      payment_method: payment_method,
      expired_at: currentTime,
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
    };

    const bookingIds = [];
    const bookingResults = [];
    const bookingServiceIds = [];
    let amount = 0;
    let roomIds = [];

    for (const roomRq of rooms) {
      const { room_type_id, quantity, services } = roomRq;

      for (let i = 0; i < quantity; i++) {
       
        let bestRoomId = await getBestRoomId(
          room_type_id,
          startDate,
          endDate,
          userId
        );

        if (!bestRoomId) {
          const fallBackRoomIds = await RoomModel.findFallbackRooms(
            room_type_id,
            1,
            check_in_date,
            check_out_date,
            userId
          );
          if (fallBackRoomIds.length === 0) {
            
            if (bookingIds.length > 0) {
              await BookingModel.deleteByIdIn(bookingIds);
            }
            if (bookingServiceIds.length > 0) {
              await BookingServiceModel.deleteByIdIn(bookingServiceIds);
            }
            await OrderModel.deleteById(order.order_id);
            return res.status(409).json({
              statusCode: 409,
              message: "Không còn phòng khả dụng để đặt",
              data: null,
            });
          }
          bestRoomId = fallBackRoomIds[0].room_id;
        }
        roomIds.push(bestRoomId);

       
        const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const basePriceRow = await RoomModel.findRoomBasePrice(bestRoomId);
        const basePrice = basePriceRow[0].base_price;
        let totalPrice = basePrice * nights;

       
        const promotions =
          await PromotionModel.findPromotionRoomTypeId(room_type_id);

        for (const { discount_value, type_name } of promotions) {
          if (type_name === "Giảm giá phần trăm") {
            const discountAmount = Math.ceil(
              (discount_value * totalPrice) / 100
            );
            totalPrice -= discountAmount;
          } else if (type_name === "Giảm giá cố định") {
            totalPrice -= discount_value;
          }
        }

        totalPrice = Math.max(0, totalPrice);

        const booking = {
          ...initBooking,
          room_id: bestRoomId,
          total_price: totalPrice,
        };
        const bookingResult = await BookingModel.create(booking);

        
        let totalServicePrice = 0;
        const servicesResults = [];

        for (const { service_id, quantity } of services) {
          const services = await ServiceModel.findByIdAndActive(service_id);
          if (!services || services.length === 0) {
            continue;
          }
          const service = services[0];
          const bookingService = {
            booking_id: bookingResult.booking_id,
            service_id: service.service_id,
            quantity: quantity,
            price: service.price,
          };

          const bookingServiceResult =
            await BookingServiceModel.create(bookingService);
          bookingServiceIds.push(bookingServiceResult.booking_service_id);
          servicesResults.push({
            service_id: service.service_id,
            service_name: service.service_name,
            quantity: bookingServiceResult.quantity,
            price: bookingServiceResult.price,
          });

          totalServicePrice =
            totalServicePrice +
            bookingServiceResult.quantity * bookingServiceResult.price;
          amount = totalPrice + totalServicePrice;
        }
        bookingResult.services = servicesResults;
        bookingResults.push(bookingResult);
        bookingIds.push(bookingResult.booking_id);
      }
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
        description: `Thanh toan ${order.order_code}`,
        cancelUrl: cancel_url,
        returnUrl: return_url,
      };
      try {
        const paymentLinkRes = await payOS.createPaymentLink(payOsBody);

        // Hold phòng 10 phút
        await RoomHoldModel.updateExpiredAt({
          roomIds: roomIds,
          checkInDate: startDate,
          checkOutDate: endDate,
          userId: userId,
          expiredAt: currentTime,
        });

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
    console.error("Lỗi đặt phòng : ", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Lỗi máy chủ",
      data: null,
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
    //Check room hold
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

      // Nếu trùng ngày đặt
      if (startDate < bOutDate && endDate > bInDate) {
        isConflict = true;
        break;
      }

      // Tìm gap time nhỏ nhất
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
