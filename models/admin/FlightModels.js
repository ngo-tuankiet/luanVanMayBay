
const db = require('../../config/db');

const FlightModel = {
  getPaged: (whereSQL, params, orderSQL, limit, offset) => {
    return db.query(
      `SELECT * FROM Flights ${whereSQL} ${orderSQL} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
  },

  count: (whereSQL, params) => {
    return db.query(`SELECT COUNT(*) AS total FROM Flights ${whereSQL}`, params);
  },

  // Lấy 1 chuyến bay theo ID
  getById: async (id) => {
    const [rows] = await db.query('SELECT * FROM Flights WHERE flight_id = ?', [id]);
    return rows[0];
  },

  create: async (flight) => {
    const {
      flight_code, airline, plane_type,
      departure, destination, depart_time, arrive_time, base_price
    } = flight;

    const [result] = await db.query(
      `INSERT INTO Flights (flight_code, airline, plane_type, departure, destination, depart_time, arrive_time, base_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [flight_code, airline, plane_type, departure, destination, depart_time, arrive_time, base_price]
    );

    return result;
  },

  // Cập nhật chuyến bay theo ID
  update: async (id, flight) => {
    const {
      flight_code, airline, plane_type,
      departure, destination, depart_time, arrive_time, base_price
    } = flight;

    const [result] = await db.query(
      `UPDATE Flights SET flight_code=?, airline=?, plane_type=?, departure=?, destination=?, depart_time=?, arrive_time=?, base_price=?
       WHERE flight_id=?`,
      [flight_code, airline, plane_type, departure, destination, depart_time, arrive_time, base_price, id]
    );

    return result;
  },

  // Xoá chuyến bay theo ID
  delete: async (id) => {
    const [result] = await db.query('DELETE FROM Flights WHERE flight_id = ?', [id]);
    return result;
  },

  // Lấy chuyến bay theo mã code
  getByCode: async (code) => {
    const [rows] = await db.query(
      'SELECT * FROM Flights WHERE flight_code = ?',
      [code]
    );
    return rows[0];
  }
};

module.exports = FlightModel;
