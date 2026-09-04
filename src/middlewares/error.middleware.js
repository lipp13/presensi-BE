const { errorResponse } = require("../utils/response");

/**
 * Middleware untuk menangani request ke endpoint yang tidak ditemukan (404)
 */
function notFoundHandler(req, res, next) {
  return errorResponse(
    res,
    `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`,
    "ROUTE_NOT_FOUND",
    404
  );
}

/**
 * Middleware penanganan error terpusat (Global Error Handler)
 */
function errorHandler(err, req, res, next) {
  console.error("[ERROR]", err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Terjadi kesalahan pada server internal";
  const code = err.code || "INTERNAL_SERVER_ERROR";

  return errorResponse(res, message, code, statusCode, process.env.NODE_ENV === "development" ? err.stack : undefined);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
