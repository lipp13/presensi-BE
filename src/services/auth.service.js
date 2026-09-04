const { supabase, supabaseAdmin } = require("../config/supabase");

/**
 * Service untuk menangani alur bisnis autentikasi Supabase Auth
 */

/**
 * Login pengguna dengan email & password
 * @param {string} email 
 * @param {string} password 
 */
async function loginUser(email, password) {
  if (!supabase) {
    throw {
      statusCode: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Koneksi Supabase belum dikonfigurasi pada file .env",
    };
  }

  // 1. Autentikasi kredensial ke Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw {
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Email atau password yang Anda masukkan salah",
      details: error.message,
    };
  }

  // 2. Ambil data profil dari tabel public.profiles
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, nisn, school, major, role")
    .eq("id", data.user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("[AUTH SERVICE] Gagal mengambil profil:", profileError);
  }

  // Fallback profile jika trigger belum selesai berjalan
  const userProfile = profile || {
    id: data.user.id,
    email: data.user.email,
    full_name: data.user.user_metadata?.full_name || "Siswa PKL",
    nisn: data.user.user_metadata?.nisn || null,
    school: data.user.user_metadata?.school || "SMK Taruna Bhakti",
    major: data.user.user_metadata?.major || null,
    role: data.user.user_metadata?.role || "user",
  };

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    expires_at: data.session.expires_at,
    user: userProfile,
  };
}

/**
 * Mengirim email instruksi reset password
 * @param {string} email 
 */
async function sendPasswordResetEmail(email) {
  if (!supabase) {
    throw {
      statusCode: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Koneksi Supabase belum dikonfigurasi pada file .env",
    };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    throw {
      statusCode: 400,
      code: "RESET_PASSWORD_FAILED",
      message: "Gagal mengirim email reset password",
      details: error.message,
    };
  }

  return {
    email,
    message: "Tautan instruksi reset password telah dikirimkan ke email Anda jika terdaftar.",
  };
}

/**
 * Mengubah password pengguna yang sedang login
 * @param {string} userId 
 * @param {string} newPassword 
 */
async function updateUserPassword(userId, newPassword) {
  if (!supabaseAdmin) {
    throw {
      statusCode: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Koneksi Supabase Admin belum dikonfigurasi",
    };
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    throw {
      statusCode: 400,
      code: "UPDATE_PASSWORD_FAILED",
      message: "Gagal memperbarui password",
      details: error.message,
    };
  }

  return { message: "Password berhasil diperbarui." };
}

/**
 * Mengambil profil lengkap user berdasarkan ID
 * @param {string} userId 
 */
async function getUserProfileById(userId) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, nisn, school, major, role, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (error) {
    throw {
      statusCode: 404,
      code: "PROFILE_NOT_FOUND",
      message: "Profil pengguna tidak ditemukan",
      details: error.message,
    };
  }

  return data;
}

module.exports = {
  loginUser,
  sendPasswordResetEmail,
  updateUserPassword,
  getUserProfileById,
};
