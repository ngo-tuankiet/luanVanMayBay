const db =  require('../config/db');

exports.findRoomGroup = async (room_type_id,room_quantity,check_in,check_out) => {
 const [rows] = await db.query(`
    SELECT r.room_id, r.room_number, r.floor
    FROM rooms r
    WHERE r.room_type_id = ? AND r.is_active = TRUE AND r.room_id NOT IN (
      SELECT b.room_id
      FROM bookings b
      WHERE (b.check_in_date < ? AND b.check_out_date > ?)   AND b.booking_status IN ('pending', 'confirmed')) ORDER BY r.floor, r.room_number `, [room_type_id, check_out, check_in]);
    if (rows.length < room_quantity ) return null;
    const groupedByFloor = {};
    for (const room of rows){
        if (!groupedByFloor[room.floor]) groupedByFloor[room.floor] =[];
        groupedByFloor[room.floor].push(room);
        }
    for (const floor in groupedByFloor) {
        const rooms = groupedByFloor[floor];
        for (let i = 0; i <= room_quantity - room_quantity; i++) {
            const chunk = rooms.slice(i,i+room_quantity);
            const first = parseInt(chunk[0].room_number);
            const last = parseInt(chunk[chunk.length-1].room_number);
            if (last - first <= room_quantity+1) return {bestFit: chunk.map(r=>r.room_id),alternatives:[]};

        }
    }
    const alternatives = [];
    for (const floor in groupedByFloor) {
        const rooms = groupedByFloor[floor];
        if (rooms.length > 2 ) {
            alternatives.push({  room_ids: rooms.slice(0, Math.min(room_quantity, rooms.length)).map(r => r.room_id), note: `Tầng ${floor}, nhưng không đủ gần nhau`});
        }
    }
    if (rows.length >= room_quantity) {
    alternatives.push({
      room_ids: rows.slice(0, room_quantity).map(r => r.room_id),
      note: 'Chọn ngẫu nhiên trong danh sách trống'
    });
  }

  return { bestFit: null, alternatives };
    };
    exports.findBestFitSmart = async (room_type_id, check_in, check_out) => {
  const [rooms] = await db.query(`
    SELECT r.room_id
    FROM rooms r
    WHERE r.room_type_id = ? AND r.is_active = TRUE
  `, [room_type_id]);

  let bestScore = -Infinity;
  let bestRoom = null;

  for (const room of rooms) {
    const [bookings] = await db.query(`
      SELECT check_in_date, check_out_date
      FROM bookings
      WHERE room_id = ? AND booking_status IN ('pending', 'confirmed')
      ORDER BY check_in_date
    `, [room.room_id]);

    let isConflict = false;
    let score = 0;
    const inDate = new Date(check_in);
    const outDate = new Date(check_out);

    for (const b of bookings) {
      const bIn = new Date(b.check_in_date);
      const bOut = new Date(b.check_out_date);

      if (inDate < bOut && outDate > bIn) {
        isConflict = true;
        break;
      }

      if (Math.abs(bOut - inDate) <= 86400000) score += 10; 
      if (Math.abs(bIn - outDate) <= 86400000) score += 10; 
      if (Math.abs(bOut - inDate) <= 2 * 86400000) score += 5; 
    }

    if (!isConflict && score > bestScore) {
      bestScore = score;
      bestRoom = room.room_id;
    }
  }

  return bestRoom;
};