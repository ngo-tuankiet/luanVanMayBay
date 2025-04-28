// 📁 controllers/admin/FlightController.js
const FlightModel = require('../../models/admin/FlightModels');
exports.createFlight = async (req, res) => {
  const {
    flight_code, airline, plane_type,
    departure, destination, depart_time, arrive_time, base_price
  } = req.body;

  if (!flight_code || !departure || !destination || !depart_time || !arrive_time) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin chuyến bay' });
  }

  try {
    const result = await FlightModel.create(req.body);
    res.status(201).json({ message: 'Tạo chuyến bay thành công', insertId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo chuyến bay', error: error.message });
  }
};

exports.updateFlight = async (req, res) => {
  const id = req.params.id;

  try {
    const flight = await FlightModel.getById(id);
    if (!flight) {
      return res.status(404).json({ message: 'Không tìm thấy chuyến bay cần cập nhật' });
    }

    const result = await FlightModel.update(id, req.body);
    res.json({ message: 'Cập nhật thành công', affectedRows: result.affectedRows });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật chuyến bay', error: error.message });
  }
};

exports.deleteFlight = async (req, res) => {
  const id = req.params.id;

  try {
    const flight = await FlightModel.getById(id);
    if (!flight) {
      return res.status(404).json({ message: 'Không tìm thấy chuyến bay cần xóa' });
    }

    const result = await FlightModel.delete(id);
    res.json({ message: 'Xóa thành công', affectedRows: result.affectedRows });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa chuyến bay', error: error.message });
  }
};

exports.getByFlightCode = async (req, res) => {
  const { code } = req.params;
  try {
    const flight = await FlightModel.getByCode(code);
    if (!flight) {
      return res.status(404).json({ message: 'Không tìm thấy chuyến bay với mã này' });
    }
    res.json(flight);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi tìm chuyến bay', error: error.message });
  }
};

exports.updateByFlightCode = async (req, res) => {
  const { code } = req.params;
  try {
    const flight = await FlightModel.getByCode(code);
    if (!flight) return res.status(404).json({ message: 'Không tìm thấy chuyến bay' });

    const result = await FlightModel.update(flight.flight_id, req.body);
    res.json({ message: 'Cập nhật thành công', affectedRows: result.affectedRows });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật chuyến bay', error: error.message });
  }
};

exports.deleteByFlightCode = async (req, res) => {
  const { code } = req.params;
  try {
    const flight = await FlightModel.getByCode(code);
    if (!flight) return res.status(404).json({ message: 'Không tìm thấy chuyến bay' });

    const result = await FlightModel.delete(flight.flight_id);
    res.json({ message: 'Xóa thành công', affectedRows: result.affectedRows });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa chuyến bay', error: error.message });
  }
};
