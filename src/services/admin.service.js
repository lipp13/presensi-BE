const { supabaseAdmin } = require("../config/supabase");

/**
 * Service untuk operasi khusus Admin:
 * - Memantau presensi hari ini
 * - Melihat seluruh riwayat presensi semua siswa
 * - Manajemen data siswa PKL (mendaftarkan akun siswa baru)
 */

/**
 * Mengambil daftar seluruh presensi hari ini
 */
async function getTodayAttendance() {
  if (!supabaseAdmin) {
    throw {
      statusCode: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Layanan Supabase belum dikonfigurasi.",
    };
  }

  const todayDate = new Date().toISOString().split("T")[0];

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("*, profiles(id, full_name, email, nisn, school, major), locations(name)")
    .eq("attendance_date", todayDate)
    .order("check_in_time", { ascending: false });

  if (error) {
    throw {
      statusCode: 500,
      code: "QUERY_ERROR",
      message: "Gagal memuat data presensi hari ini.",
      details: error.message,
    };
  }

  return {
    today_date: todayDate,
    total: data.length,
    attendance: data,
  };
}

/**
 * Mengambil seluruh riwayat presensi semua siswa dengan filter
 * @param {object} filters - { start_date, end_date, user_id, status, limit, page }
 */
async function getAllAttendanceHistory(filters = {}) {
  if (!supabaseAdmin) {
    throw {
      statusCode: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Layanan Supabase belum dikonfigurasi.",
    };
  }

  const limit = Math.min(parseInt(filters.limit, 10) || 50, 500);
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const fromIndex = (page - 1) * limit;
  const toIndex = fromIndex + limit - 1;

  let query = supabaseAdmin
    .from("attendance")
    .select("*, profiles(id, full_name, email, nisn, school, major), locations(name)", { count: "exact" });

  if (filters.start_date) {
    query = query.gte("attendance_date", filters.start_date);
  }
  if (filters.end_date) {
    query = query.lte("attendance_date", filters.end_date);
  }
  if (filters.user_id) {
    query = query.eq("user_id", filters.user_id);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  query = query
    .order("attendance_date", { ascending: false })
    .order("check_in_time", { ascending: false })
    .range(fromIndex, toIndex);

  const { data, count, error } = await query;

  if (error) {
    throw {
      statusCode: 500,
      code: "QUERY_ERROR",
      message: "Gagal memuat seluruh riwayat presensi.",
      details: error.message,
    };
  }

  return {
    total: count || 0,
    page,
    limit,
    total_pages: Math.ceil((count || 0) / limit),
    attendance: data || [],
  };
}

/**
 * Mengambil data presensi tanpa pagination untuk diekspor ke Excel
 * @param {object} filters 
 */
async function getAttendanceForExport(filters = {}) {
  if (!supabaseAdmin) {
    throw {
      statusCode: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Layanan Supabase belum dikonfigurasi.",
    };
  }

  let query = supabaseAdmin
    .from("attendance")
    .select("*, profiles(id, full_name, email, nisn, school, major), locations(name)");

  if (filters.start_date) {
    query = query.gte("attendance_date", filters.start_date);
  }
  if (filters.end_date) {
    query = query.lte("attendance_date", filters.end_date);
  }
  if (filters.user_id) {
    query = query.eq("user_id", filters.user_id);
  }

  query = query
    .order("attendance_date", { ascending: true })
    .order("check_in_time", { ascending: true })
    .limit(5000);

  const { data, error } = await query;

  if (error) {
    throw {
      statusCode: 500,
      code: "QUERY_ERROR",
      message: "Gagal mengambil data presensi untuk diekspor.",
      details: error.message,
    };
  }

  return data || [];
}

/**
 * Mengambil daftar seluruh profil siswa PKL
 */
async function getAllStudents() {
  if (!supabaseAdmin) {
    throw {
      statusCode: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Layanan Supabase belum dikonfigurasi.",
    };
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, nisn, school, major, role, created_at")
    .eq("role", "user")
    .order("full_name", { ascending: true });

  if (error) {
    throw {
      statusCode: 500,
      code: "QUERY_ERROR",
      message: "Gagal mengambil daftar siswa PKL.",
      details: error.message,
    };
  }

  return data || [];
}

/**
 * Mendaftarkan akun siswa baru oleh Admin
 * @param {object} studentData - { email, password, full_name, nisn, school, major }
 */
async function createStudent(studentData) {
  const { email, password, full_name, nisn, school, major } = studentData;

  if (!email || !password || !full_name) {
    throw {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Email, password, dan nama lengkap siswa wajib diisi.",
    };
  }

  if (!supabaseAdmin) {
    throw {
      statusCode: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Layanan Supabase belum dikonfigurasi.",
    };
  }

  // Pre-check apakah NISN sudah digunakan oleh siswa lain
  if (nisn) {
    const cleanNisn = String(nisn).trim();
    const { data: existingStudent } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("nisn", cleanNisn)
      .maybeSingle();

    if (existingStudent) {
      throw {
        statusCode: 409,
        code: "NISN_ALREADY_EXISTS",
        message: `NISN '${cleanNisn}' sudah terdaftar atas nama siswa: ${existingStudent.full_name}.`,
      };
    }
  }

  // 1. Buat user di Supabase Auth
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: {
      full_name: full_name.trim(),
      nisn: nisn ? String(nisn).trim() : null,
      school: school ? school.trim() : "SMK Taruna Bhakti",
      major: major ? major.trim() : null,
      role: "user",
    },
  });

  if (authError) {
    throw {
      statusCode: 400,
      code: "CREATE_STUDENT_FAILED",
      message: `Gagal membuat akun siswa: ${authError.message}`,
      details: authError,
    };
  }

  return {
    id: authUser.user.id,
    email: authUser.user.email,
    full_name,
    nisn,
    school: school || "SMK Taruna Bhakti",
    major,
    role: "user",
  };
}

module.exports = {
  getTodayAttendance,
  getAllAttendanceHistory,
  getAttendanceForExport,
  getAllStudents,
  createStudent,
};
