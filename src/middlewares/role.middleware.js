const { errorResponse } = require("../utils/response");

/**
 * Middleware untuk membatasi akses endpoint berdasarkan Role pengguna
 * @param {string|string[]} allowedRoles - Role yang diizinkan (misal: 'admin' atau ['admin', 'user'])
 */
function authorize(allowedRoles = []) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return function (req, res, next) {
    if (!req.user) {
      return errorResponse(
        res,
        "Akses tidak diizinkan. User belum terautentikasi.",
        "UNAUTHORIZED",
        401
      );
    }

    const userRole = req.user.role;

    if (!roles.includes(userRole)) {
      return errorResponse(
        res,
        `Akses ditolak. Fitur ini hanya dapat diakses oleh role: ${roles.join(", ")}. Role Anda: ${userRole}`,
        "FORBIDDEN",
        403
      );
    }

    next();
  };
}

module.exports = {
  authorize,
};
