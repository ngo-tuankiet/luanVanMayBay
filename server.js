// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// Các route xác thực (Signup, Login, Forgot Password)
const authRoutes = require("./routes/authRoutes");
app.use("/auth", authRoutes);

const forgotPasswordRoutes = require("./routes/forgotPasswordRoutes");
app.use("/auth", forgotPasswordRoutes);

// Route quản lý chuyến bay
const flightRoutes = require("./routes/flightRoutes");
app.use("/flights", flightRoutes);

// Endpoint bảo vệ để test JWT và phân quyền
const { verifyToken, authorizeRoles } = require("./middlewares/authMiddleware");
app.get("/protected", verifyToken, authorizeRoles("Admin", "Agent", "Passenger"), (req, res) => {
  res.json({ message: `Chào mừng ${req.user.email}, bạn có quyền truy cập trang bảo vệ này.` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
