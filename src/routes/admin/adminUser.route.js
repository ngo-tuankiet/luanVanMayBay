const express = require('express');
const router = express.Router();
const AdminUserController = require('../../controllers/admin/adminUser.controller');
const {verifyToken,authorizeRoles } = require('../../middlewares/authMiddleware');

router.use(verifyToken,authorizeRoles("admin"));

router.get("/",AdminUserController.getAllUsers);
router.post("/",AdminUserController.createUser);
router.delete("/:id", AdminUserController.deleteUser);
router.put("/:id", AdminUserController.updateUser); 
module.exports = router;