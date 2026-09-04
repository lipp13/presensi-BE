const authService = require("../services/auth.service");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Controller untuk menangani endpoint autentikasi
 */

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(
        res,
        "Email dan password wajib diisi.",
        "VALIDATION_ERROR",
        400
      );
    }

    const result = await authService.loginUser(email.trim(), password);

    return successResponse(res, "Login berhasil.", result, 200);
  } catch (error) {
    if (error.code && error.statusCode) {
      return errorResponse(res, error.message, error.code, error.statusCode, error.details);
    }
    next(error);
  }
}

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 */
async function forgotPassword(req, res, next) {
  try {
    const { email, redirect_to } = req.body;

    if (!email) {
      return errorResponse(
        res,
        "Email wajib diisi.",
        "VALIDATION_ERROR",
        400
      );
    }

    const result = await authService.sendPasswordResetEmail(email.trim(), redirect_to);

    return successResponse(res, result.message, { email }, 200);
  } catch (error) {
    if (error.code && error.statusCode) {
      return errorResponse(res, error.message, error.code, error.statusCode, error.details);
    }
    next(error);
  }
}

/**
 * POST /api/auth/reset-password
 * Header: Authorization: Bearer <token>
 * Body: { password }
 */
async function resetPassword(req, res, next) {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return errorResponse(
        res,
        "Password baru wajib diisi dan minimal 6 karakter.",
        "VALIDATION_ERROR",
        400
      );
    }

    const result = await authService.updateUserPassword(req.user.id, password);

    return successResponse(res, result.message, null, 200);
  } catch (error) {
    if (error.code && error.statusCode) {
      return errorResponse(res, error.message, error.code, error.statusCode, error.details);
    }
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 */
async function getMe(req, res, next) {
  try {
    const profile = await authService.getUserProfileById(req.user.id);

    return successResponse(res, "Data profil pengguna berhasil dimuat.", {
      user: profile,
    }, 200);
  } catch (error) {
    if (error.code && error.statusCode) {
      return errorResponse(res, error.message, error.code, error.statusCode, error.details);
    }
    next(error);
  }
}

/**
 * POST /api/auth/change-password
 * Header: Authorization: Bearer <token>
 * Body: { old_password, new_password }
 */
async function changePassword(req, res, next) {
  try {
    const { old_password, new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return errorResponse(
        res,
        "Password baru wajib diisi dan minimal 6 karakter.",
        "VALIDATION_ERROR",
        400
      );
    }

    const result = await authService.changeUserPassword(
      req.user.email,
      req.user.id,
      old_password,
      new_password
    );

    return successResponse(res, result.message, null, 200);
  } catch (error) {
    if (error.code && error.statusCode) {
      return errorResponse(res, error.message, error.code, error.statusCode, error.details);
    }
    next(error);
  }
}

module.exports = {
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
};
