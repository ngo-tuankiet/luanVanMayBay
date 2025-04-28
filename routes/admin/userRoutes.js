const express = require('express');
const router = express.Router();
const userController = require('../../controllers/admin/UserController');
const { verifyToken, authorizeRoles } = require('../../middlewares/authMiddleware');

// Áp dụng xác thực và chỉ cho Admin dùng toàn bộ
router.use(verifyToken, authorizeRoles('Admin'));

//  Lấy danh sách người dùng (có tìm kiếm + phân trang)
router.get('/', userController.getAllUsers);

// Tạo người dùng mới
router.post('/', userController.createUser);

//  Cập nhật người dùng theo email
router.put('/:email', userController.updateUserByEmail);

//  Xoá người dùng theo email
router.delete('/:email', userController.deleteUserByEmail);

module.exports = router;
