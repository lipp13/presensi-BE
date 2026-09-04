const express = require("express");
const router = express.Router();

const attendanceController = require("../controllers/attendance.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// Seluruh endpoint presensi mewajibkan autentikasi (Bearer Token siswa)
router.use(authenticate);

// 1. Rekam Presensi
router.post("/check-in", attendanceController.checkIn);
router.post("/check-out", attendanceController.checkOut);

// 2. Status & Riwayat Kehadiran Siswa
router.get("/today", attendanceController.getToday);
router.get("/history", attendanceController.getHistory);
router.get("/:id", attendanceController.getById);

module.exports = router;
