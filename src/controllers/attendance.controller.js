const attendanceService = require("../services/attendance.service");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Controller untuk menangani endpoint presensi siswa PKL
 */

/**
 * POST /api/attendance/check-in
 * Body: { latitude, longitude, accuracy, photo_path }
 */
async function checkIn(req, res, next) {
  try {
    const result = await attendanceService.checkIn(req.user.id, req.body);
    return successResponse(res, "Presensi masuk (check-in) berhasil dicatat.", result, 201);
  } catch (error) {
    if (error.code && error.statusCode) {
      return errorResponse(res, error.message, error.code, error.statusCode, error.details);
    }
    next(error);
  }
}

/**
 * POST /api/attendance/check-out
 * Body: { latitude, longitude, accuracy, photo_path }
 */
async function checkOut(req, res, next) {
  try {
    const result = await attendanceService.checkOut(req.user.id, req.body);
    return successResponse(res, "Presensi pulang (check-out) berhasil dicatat.", result, 200);
  } catch (error) {
    if (error.code && error.statusCode) {
      return errorResponse(res, error.message, error.code, error.statusCode, error.details);
    }
    next(error);
  }
}

/**
 * GET /api/attendance/today
 * Memeriksa status absensi user yang sedang login untuk hari ini
 */
async function getToday(req, res, next) {
  try {
    const result = await attendanceService.getTodayAttendance(req.user.id);
    return successResponse(res, "Status presensi hari ini berhasil dimuat.", result, 200);
  } catch (error) {
    if (error.code && error.statusCode) {
      return errorResponse(res, error.message, error.code, error.statusCode, error.details);
    }
    next(error);
  }
}

/**
 * GET /api/attendance/history
 * Menampilkan riwayat kehadiran siswa yang login
 */
async function getHistory(req, res, next) {
  try {
    const history = await attendanceService.getAttendanceHistory(req.user.id, req.query);
    return successResponse(res, "Riwayat presensi berhasil dimuat.", {
      total: history.length,
      attendance: history,
    }, 200);
  } catch (error) {
    if (error.code && error.statusCode) {
      return errorResponse(res, error.message, error.code, error.statusCode, error.details);
    }
    next(error);
  }
}

/**
 * GET /api/attendance/:id
 * Menampilkan detail satu presensi
 */
async function getById(req, res, next) {
  try {
    const isAdmin = req.user.role === "admin";
    const attendance = await attendanceService.getAttendanceById(req.params.id, req.user.id, isAdmin);
    return successResponse(res, "Detail presensi berhasil dimuat.", { attendance }, 200);
  } catch (error) {
    if (error.code && error.statusCode) {
      return errorResponse(res, error.message, error.code, error.statusCode, error.details);
    }
    next(error);
  }
}

module.exports = {
  checkIn,
  checkOut,
  getToday,
  getHistory,
  getById,
};
