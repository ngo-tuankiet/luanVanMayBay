const db = require('../config/db');
exports.getAllRooms = async(req,res) => {
    try {
        const [rooms] = await db.query (
            'SELECT r.room_id,   r.room_number,   r.floor,  r.is_active,  rt.room_type_id,  rt.type_name AS room_type_name,  rt.base_price FROM rooms r JOIN room_types rt ON r.room_type_id = rt.room_type_id ');
        res.json({statusCode: 200,
             message: 'Danh sách tất cả các phòng',
            data :rooms});
    }
    catch (error ) {
            console.error('Lỗi lấy danh sách phòng:', error);
            res.status(500).json({
      statusCode: 500,
      message: 'Lỗi máy chủ',
      error: error.message
    });
  }
};