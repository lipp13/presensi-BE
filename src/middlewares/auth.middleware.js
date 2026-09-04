const { supabase, supabaseAdmin } = require("../config/supabase");
const { errorResponse } = require("../utils/response");

/**
 * Middleware untuk memvalidasi token JWT Supabase Auth
 * Memastikan request dikirim oleh user yang valid dan sedang login
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(
        res,
        "Akses ditolak. Token otentikasi tidak disertakan atau format salah (gunakan format: Bearer <token>).",
        "UNAUTHORIZED",
        401
      );
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return errorResponse(
        res,
        "Akses ditolak. Token tidak ditemukan.",
        "TOKEN_MISSING",
        401
      );
    }

    if (!supabase) {
      return errorResponse(
        res,
        "Layanan Supabase belum dikonfigurasi.",
        "SUPABASE_NOT_CONFIGURED",
        500
      );
    }

    // 1. Verifikasi token ke Supabase Auth
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return errorResponse(
        res,
        "Sesi Anda telah kedaluwarsa atau token tidak valid. Silakan login kembali.",
        "INVALID_TOKEN",
        401,
        error ? error.message : null
      );
    }

    // 2. Ambil role dan profil lengkap dari tabel public.profiles
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, nisn, school, major, role")
      .eq("id", data.user.id)
      .single();

    // 3. Tempelkan informasi user ke objek request (req.user)
    req.user = {
      id: data.user.id,
      email: data.user.email,
      role: profile?.role || data.user.user_metadata?.role || "user",
      profile: profile || null,
      token,
    };

    next();
  } catch (err) {
    return errorResponse(
      res,
      "Terjadi kesalahan saat memverifikasi autentikasi.",
      "AUTH_INTERNAL_ERROR",
      500,
      process.env.NODE_ENV === "development" ? err.message : null
    );
  }
}

module.exports = {
  authenticate,
};
