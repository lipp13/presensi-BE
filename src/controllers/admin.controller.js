const adminService = require("../services/admin.service");
const exportService = require("../services/export.service");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Controller untuk menangani endpoint admin (khusus role admin)
 */

/**
 * GET /api/admin/attendance/today
 * Menampilkan daftar kehadiran seluruh siswa hari ini
 */
async function getTodayAttendance(req, res, next) {
  try {
    const result = await adminService.getTodayAttendance();
    return successResponse(res, "Data presensi hari ini berhasil dimuat.", result, 200);
  } catch (error) {
    if (error.code && error.statusCode) {
      return errorResponse(res, error.message, error.code, error.statusCode, error.details);
    }
    next(error);
  }
}

/**
 * GET /api/admin/attendance/history
 * Menampilkan seluruh riwayat presensi semua siswa dengan filter & pagination
 */
async function getAllAttendanceHistory(req, res, next) {
  try {
    const result = await adminService.getAllAttendanceHistory(req.query);
    return successResponse(res, "Seluruh riwayat presensi berhasil dimuat.", result, 200);
  } catch (error) {
    if (error.code && error.statusCode) {
      return errorResponse(res, error.message, error.code, error.statusCode, error.details);
    }
    next(error);
  }
}

/**
 * GET /api/admin/attendance/export
 * Download file Excel (.xlsx) rekapitulasi kehadiran siswa
 */
async function exportAttendanceExcel(req, res, next) {
  try {
    const records = await adminService.getAttendanceForExport(req.query);
    const excelBuffer = await exportService.generateAttendanceExcel(records);

    const todayDate = new Date().toISOString().split("T")[0];
    const fileName = `Rekap_Presensi_PKL_${todayDate}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    return res.status(200).send(excelBuffer);
  } catch (error) {
    if (error.code && error.statusCode) {
      return errorResponse(res, error.message, error.code, error.statusCode, error.details);
    }
    next(error);
  }
}

/**
 * GET /api/admin/students
 * Mengambil daftar seluruh siswa PKL yang terdaftar
 */
async function getAllStudents(req, res, next) {
  try {
    const students = await adminService.getAllStudents();
    return successResponse(res, "Daftar siswa PKL berhasil dimuat.", {
      total: students.length,
      students,
    }, 200);
  } catch (error) {
    if (error.code && error.statusCode) {
      return errorResponse(res, error.message, error.code, error.statusCode, error.details);
    }
    next(error);
  }
}

/**
 * POST /api/admin/students
 * Mendaftarkan akun siswa PKL baru
 */
async function createStudent(req, res, next) {
  try {
    const result = await adminService.createStudent(req.body);
    return successResponse(res, "Akun siswa PKL berhasil didaftarkan.", result, 201);
  } catch (error) {
    if (error.code && error.statusCode) {
      return errorResponse(res, error.message, error.code, error.statusCode, error.details);
    }
    next(error);
  }
}

module.exports = {
  getTodayAttendance,
  getAllAttendanceHistory,
  exportAttendanceExcel,
  getAllStudents,
  createStudent,
};
