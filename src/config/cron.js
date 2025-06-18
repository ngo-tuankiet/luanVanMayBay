// // trong server.js hoặc file cron.js
//
// const cron = require("node-cron");
// const db = require("./db");
//
// // Chạy mỗi phút
// cron.schedule("* * * * *", async () => {
//   try {
//     const [result] = await db.query(`
//       UPDATE bookings
//       SET booking_status = 'cancelled'
//       WHERE booking_status = 'pending'
//         AND hold_expired_at IS NOT NULL
//         AND hold_expired_at < NOW()
//     `);
//
//     if (result.affectedRows > 0) {
//       console.log(
//         `Auto-cancelled ${result.affectedRows} booking(s) pending quá 20 phút.`
//       );
//     }
//   } catch (error) {
//     console.error("Lỗi cron auto-cancel booking:", error);
//   }
// });
