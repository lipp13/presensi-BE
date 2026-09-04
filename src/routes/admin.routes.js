const express = require("express");
const router = express.Router();

const adminController = require("../controllers/admin.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

// Proteksi seluruh rute: Wajib Login & Wajib memiliki Role 'admin'
router.use(authenticate);
router.use(authorize(["admin"]));

// 1. Monitoring Kehadiran
router.get("/attendance/today", adminController.getTodayAttendance);
router.get("/attendance/history", adminController.getAllAttendanceHistory);

// 2. Export Data ke Excel
router.get("/attendance/export", adminController.exportAttendanceExcel);

// 3. Manajemen Akun Siswa PKL (Khusus Admin)
router.get("/students", adminController.getAllStudents);
router.post("/students", adminController.createStudent);

module.exports = router;
