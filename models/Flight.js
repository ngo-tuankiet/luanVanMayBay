// models/Flight.js
const db = require('../config/db');

const Flight = {
  async getAll() {
    const [rows] = await db.query('SELECT * FROM Flights');
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query('SELECT * FROM Flights WHERE flight_id = ?', [id]);
    return rows;
  },

  async create(data) {
    const { flight_number, airline, departure_airport, arrival_airport, departure_date, departure_time, arrival_time, price, max_passengers, aircraft_id } = data;
    const [result] = await db.query(
      `INSERT INTO Flights (flight_number, airline, departure_airport, arrival_airport, departure_date, departure_time, arrival_time, price, max_passengers, aircraft_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [flight_number, airline, departure_airport, arrival_airport, departure_date, departure_time, arrival_time, price, max_passengers, aircraft_id || null]
    );
    return result.insertId;
  },

  async update(id, data) {
    const { flight_number, airline, departure_airport, arrival_airport, departure_date, departure_time, arrival_time, price, max_passengers, aircraft_id } = data;
    const [result] = await db.query(
      `UPDATE Flights SET flight_number = ?, airline = ?, departure_airport = ?, arrival_airport = ?, departure_date = ?, departure_time = ?, arrival_time = ?, price = ?, max_passengers = ?, aircraft_id = ?
       WHERE flight_id = ?`,
      [flight_number, airline, departure_airport, arrival_airport, departure_date, departure_time, arrival_time, price, max_passengers, aircraft_id || null, id]
    );
    return result;
  },

  async remove(id) {
    const [result] = await db.query('DELETE FROM Flights WHERE flight_id = ?', [id]);
    return result;
  }
};

module.exports = Flight;
