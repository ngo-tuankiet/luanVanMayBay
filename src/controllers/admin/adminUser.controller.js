const { captureRejectionSymbol } = require("nodemailer/lib/xoauth2");
const UserModel = require("../../models/admin/user.model");
const bcrypt = require("bcrypt");

exports.getAllUsers = async (req,res) => {
    const {page = 1, limit = 10, search = ""} = req.query;
    const skip = (page -1 ) * limit;
    try {
        const {users,total} = await UserModel.findAll(skip,limit,search);
        res.status(200).json ({
            statusCode: 200,
            message: "Lấy danh sách người dùng thành công",
            data: {total,users},
        });
    }catch (error) {
    res.status(500).json({ statusCode: 500, message: error.message });
    }
};
exports.createUser =  async(req,res) => {
    const {email,
        password,
        first_name,
        last_name,
        phone_number,
        address,
        date_of_birth,
        role
    }= req.body;
try{
    const existing = await UserModel.findByEmail(email);
    if(existing) {
        return res.status(400).json({
            statusCode: 400,
            message:"email đã tồn tại"
        });
    }
        const hashedPass = await bcrypt.hash(password, 10);

    const newUser = await UserModel.create({
    email,
    password : hashedPass,
    username: email.split("@")[0],
    first_name,
    last_name,
    phone_number,
    address,
    date_of_birth: new Date (date_of_birth),
    role: role || "user",
    is_active: true,
    });
    return res.status(201).json({
        statusCode: 201,
        message:"tạo người dùng thành công ",
        data: newUser,
    });
} catch(error){
    return res.status(500).json({
        statusCode: 500,
        message:"lỗi máy chủ",
        error:error.message,
    });
}
};
exports.updateUser = async (req,res)=> {
const {id} = req.params;
const {
    first_name,
    last_name,
    phone_number,
    address,
    date_of_birth,
    role, 
    is_active,
    password
} = req.body;
try{
    const user = await UserModel.findById(id);
    if (!user ) {
        return res.status(400).json({
            statusCode:404,
            message:"không tìm thấy người dùng",
        });
    }
    const dataUpdate = {
    first_name,
    last_name,
    phone_number,
    address,
    role, 
    is_active,
    };
    if (date_of_birth) {
  dataUpdate.date_of_birth = new Date(date_of_birth);
}
    Object.keys(dataUpdate).forEach(key => {
        if (dataUpdate[key] === undefined) delete dataUpdate[key];
    })
    if (password && password.trim() !== "") {
        const hashedpass = await bcrypt.hash(password,10);
        dataUpdate.password = hashedpass;
    }
    const updated = await UserModel.updateById(id,dataUpdate);
    res.status(200).json({
      statusCode: 200,
      message: "Cập nhật người dùng thành công",
      data: updated,
    });
}
catch(error){
res.status(500).json({
      statusCode: 500,
      message: "Lỗi máy chủ",
      error: error.message,
    });
}
};
exports.deleteUser = async (req,res) => {
    const {id } = req.params;
    try {
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: "Không tìm thấy người dùng",
      });
    }
    const hasBooking  = await UserModel.hasBookings(id);
    if (hasBooking){
         return res.status(400).json({
        statusCode: 400,
        message: "Không thể xóa người dùng đang có lịch đặt ",
      });
    }
    await UserModel.deleteById(id);
    res.status(200).json({
      statusCode: 200,
      message: "Xoá người dùng thành công",
    });
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      message: "Lỗi máy chủ",
      error: error.message,
    });
}
 };