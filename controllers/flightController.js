// controllers/flightController.js
const db = require('../config/db');

// Lấy danh sách tất cả chuyến bay
exports.getAllFlights = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Flights');
    res.json(rows);
  } catch (error) {
    console.error('Lỗi lấy danh sách chuyến bay:', error);
    res.status(500).json({ message: error.message });
  }
};

// Lấy thông tin chuyến bay theo ID
exports.getFlightById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM Flights WHERE flight_id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy chuyến bay' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Lỗi lấy thông tin chuyến bay:', error);
    res.status(500).json({ message: error.message });
  }
};

// Tạo chuyến bay mới
exports.createFlight = async (req, res) => {
  const { flight_number, airline, departure_airport, arrival_airport, departure_date, departure_time, arrival_time, price, max_passengers, aircraft_id } = req.body;
  if (!flight_number || !airline || !departure_airport || !arrival_airport || !departure_date || !departure_time || !arrival_time || !price || !max_passengers) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin chuyến bay' });
  }
  try {
    const [result] = await db.query(
      `INSERT INTO Flights (flight_number, airline, departure_airport, arrival_airport, departure_date, departure_time, arrival_time, price, max_passengers, aircraft_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [flight_number, airline, departure_airport, arrival_airport, departure_date, departure_time, arrival_time, price, max_passengers, aircraft_id || null]
    );
    res.status(201).json({ message: 'Tạo chuyến bay thành công', flight_id: result.insertId });
  } catch (error) {
    console.error('Lỗi tạo chuyến bay:', error);
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật thông tin chuyến bay
exports.updateFlight = async (req, res) => {
  const { id } = req.params;
  const { flight_number, airline, departure_airport, arrival_airport, departure_date, departure_time, arrival_time, price, max_passengers, aircraft_id } = req.body;
  try {
    const [result] = await db.query(
      `UPDATE Flights SET flight_number = ?, airline = ?, departure_airport = ?, arrival_airport = ?, departure_date = ?, departure_time = ?, arrival_time = ?, price = ?, max_passengers = ?, aircraft_id = ?
       WHERE flight_id = ?`,
      [flight_number, airline, departure_airport, arrival_airport, departure_date, departure_time, arrival_time, price, max_passengers, aircraft_id || null, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy chuyến bay để cập nhật' });
    }
    res.json({ message: 'Cập nhật chuyến bay thành công' });
  } catch (error) {
    console.error('Lỗi cập nhật chuyến bay:', error);
    res.status(500).json({ message: error.message });
  }
};

// Xoá chuyến bay
exports.deleteFlight = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM Flights WHERE flight_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy chuyến bay để xoá' });
    }
    res.json({ message: 'Xoá chuyến bay thành công' });
  } catch (error) {
    console.error('Lỗi xoá chuyến bay:', error);
    res.status(500).json({ message: error.message });
  }
};
