// 📁 controllers/admin/UserController.js
const db = require('../../config/db');
const bcrypt = require('bcryptjs');
const UserModel = require('../../models/admin/UserModel');
const UserLogModel = require('../../models/admin/UserLogModel');

exports.createUser = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Bạn không có quyền tạo người dùng' });
  }

  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Thiếu thông tin' });
  }

  try {
    const existing = await UserModel.getByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    const result = await UserModel.create({ email, password, role });

    await UserLogModel.createLog(req.user.userId, 'CREATE_USER', req.ip, `Tạo người dùng: ${email}`);

    res.status(201).json({ message: 'Tạo người dùng thành công', userId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo người dùng', error: error.message });
  }
};

exports.updateUserByEmail = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Bạn không có quyền cập nhật người dùng' });
  }

  const { email } = req.params;
  const { password, role } = req.body;

  if (!password && !role) {
    return res.status(400).json({ message: 'Cần cập nhật ít nhất một trường (password hoặc role)' });
  }

  try {
    const existing = await UserModel.getByEmail(email);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng để cập nhật' });
    }

    const result = await UserModel.updateByEmail(email, { password, role });

    await UserLogModel.createLog(req.user.userId, 'UPDATE_USER', req.ip, `Cập nhật người dùng: ${email}`);

    res.json({ message: 'Cập nhật thành công', affectedRows: result.affectedRows });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật người dùng', error: error.message });
  }
};

exports.deleteUserByEmail = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Bạn không có quyền xoá người dùng' });
  }

  const { email } = req.params;
  try {
    const existing = await UserModel.getByEmail(email);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng để xoá' });
    }

    const result = await UserModel.deleteByEmail(email);

    await UserLogModel.createLog(req.user.userId, 'DELETE_USER', req.ip, `Xoá người dùng: ${email}`);

    res.json({ message: 'Xoá thành công', affectedRows: result.affectedRows });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xoá người dùng', error: error.message });
  }
};
