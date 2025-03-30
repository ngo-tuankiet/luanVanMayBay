
const mysql = require("mysql2/promise"); // Đúng, sử dụng phiên bản có hỗ trợ Promise
require("dotenv").config();
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',      
    user: process.env.DB_USER || 'root',         
    password: process.env.DB_PASSWORD || 'Kiet123@', 
    database: process.env.DB_NAME || 'FlightManagement',
    waitForConnections: true, 
    connectionLimit: 10,      
    queueLimit: 0,
    port: process.env.DB_PORT || 3306
});

// Kiểm tra kết nối
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Kết nối MySQL thất bại:', err);
  } else {
    console.log('Kết nối MySQL thành công qua Pool');
    connection.release(); 
  }
});

module.exports = pool;
