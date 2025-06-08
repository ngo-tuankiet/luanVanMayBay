const db = require('../config/db');

exports.getAllRooms = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.room_id, r.room_number, r.floor, r.is_active, rt.room_type_id, rt.type_name AS room_type_name, rt.base_price,rt.FROM rooms r JOIN room_types rt ON r.room_type_id = rt.room_type_id `);
    const formatted = rows.map(row => ({
      room_id: row.room_id,
      room_number: row.room_number,
      floor: row.floor,
      is_active: row.is_active,
      room_type: {
        room_type_id: row.room_type_id,
        name: row.room_type_name,
        base_price: row.base_price
      }
    }));

    res.status(200).json({
      statusCode: 200,
      message: 'Danh sách tất cả các phòng',
      data: formatted
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách phòng:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Lỗi máy chủ',
      error: error.message
    });
  }
};
