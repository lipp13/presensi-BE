/**
 * Utility helper untuk standardisasi response API JSON
 * Format disesuaikan dengan standar Project Presensi Online:
 * - Sukses: { success: true, message: string, data: object }
 * - Error:  { success: false, message: string, error: { code: string, details?: any } }
 */

function successResponse(res, message = "Success", data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function errorResponse(res, message = "Terjadi kesalahan", code = "INTERNAL_ERROR", statusCode = 500, details = null) {
  const payload = {
    success: false,
    message,
    error: {
      code,
    },
  };

  if (details) {
    payload.error.details = details;
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  successResponse,
  errorResponse,
};
