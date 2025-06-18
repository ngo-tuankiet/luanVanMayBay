const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const prisma = require("./config/prisma.config");
const booking2Routes = require("./routes/booking.route");
const roomType2Route = require("./routes/roomType.route");
const payment2Route = require("./routes/payment.route");
const AdminUser = require("../src/routes/admin/adminUser.route");
const adminRoom = require("../src/routes/admin/adminRoom.route");
dotenv.config();
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(cors());

app.use(express.urlencoded({ extended: true }));


app.use("/api/auth", authRoutes);
app.use("/api/bookings2", booking2Routes);
app.use("/api/room-types", roomType2Route);
app.use("/api/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/payment", payment2Route);
app.use('/api/admin/users', AdminUser);
app.use('/api/admin/room', adminRoom);




const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("Kết nối database thành công");

    app.listen(PORT, () => {
      console.log(`Server đang chạy trên cổng ${PORT}`);
    });
  } catch (error) {
    console.error(" Khởi động server thất bại: ", error);
    process.exit(1);
  }
};

startServer().then(() => {});
