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

const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  LOCATION_OUT_OF_RANGE: "LOCATION_OUT_OF_RANGE",
  GPS_ACCURACY_TOO_LOW: "GPS_ACCURACY_TOO_LOW",
  SUSPECTED_FAKE_GPS: "SUSPECTED_FAKE_GPS",
  ALREADY_CHECKED_IN: "ALREADY_CHECKED_IN",
  ALREADY_CHECKED_OUT: "ALREADY_CHECKED_OUT",
  NOT_CHECKED_IN_YET: "NOT_CHECKED_IN_YET",
};

module.exports = {
  successResponse,
  errorResponse,
  ERROR_CODES,
};
