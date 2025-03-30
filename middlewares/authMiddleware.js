// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: 'Không có token, yêu cầu xác thực' });
  
  const token = authHeader.split(' ')[1]; // Định dạng: Bearer <token>
  if (!token)
    return res.status(401).json({ message: 'Token không hợp lệ' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập tài nguyên này' });
    }
    next();
  };
};
