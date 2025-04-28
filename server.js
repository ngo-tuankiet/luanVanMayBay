// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const authRoutes = require("./routes/authRoutes");
app.use("/auth", authRoutes);

const forgotPasswordRoutes = require("./routes/forgotPasswordRoutes");
app.use("/auth", forgotPasswordRoutes);

const { verifyToken, authorizeRoles } = require("./middlewares/authMiddleware");
app.get("/protected", verifyToken, authorizeRoles("Admin", "Passenger"), (req, res) => {
  res.json({ message: `Chào mừng ${req.user.email}, bạn có quyền truy cập trang bảo vệ này.` });
});
// Chuyến bay
const flightRoutes = require("./routes/admin/flightRoutes");
app.use("/admin/flights", flightRoutes);
// Người dùng 
const userRoutes = require('./routes/admin/userRoutes');
app.use('/admin/users', userRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
