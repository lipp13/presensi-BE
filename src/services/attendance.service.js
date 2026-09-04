const { supabaseAdmin } = require("../config/supabase");
const locationService = require("./location.service");
const storageService = require("./storage.service");
const telegramService = require("./telegram.service");

/**
 * Service untuk menangani logika bisnis pencatatan presensi siswa PKL
 */

/**
 * Mendapatkan status presensi siswa hari ini
 * @param {string} userId 
 */
async function getTodayAttendance(userId) {
  if (!supabaseAdmin) {
    throw {
      statusCode: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Layanan Supabase belum dikonfigurasi",
    };
  }

  const todayDate = new Date().toISOString().split("T")[0];

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("*, locations(name)")
    .eq("user_id", userId)
    .eq("attendance_date", todayDate)
    .maybeSingle();

  if (error) {
    throw {
      statusCode: 500,
      code: "QUERY_ERROR",
      message: "Gagal mengambil data kehadiran hari ini.",
      details: error.message,
    };
  }

  return {
    today_date: todayDate,
    has_checked_in: Boolean(data && data.check_in_time),
    has_checked_out: Boolean(data && data.check_out_time),
    attendance: data || null,
  };
}

/**
 * Melakukan presensi masuk (Check-in)
 * @param {string} userId 
 * @param {object} payload - { latitude, longitude, accuracy, photo_path }
 */
async function checkIn(userId, payload) {
  const { latitude, longitude, accuracy, photo_path } = payload;

  if (latitude === undefined || longitude === undefined || accuracy === undefined) {
    throw {
      statusCode: 400,
      code: "MISSING_LOCATION_DATA",
      message: "Data koordinat (latitude, longitude, dan accuracy) wajib disertakan.",
    };
  }

  if (!supabaseAdmin) {
    throw {
      statusCode: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Layanan Supabase belum dikonfigurasi.",
    };
  }

  // 1. Validasi Akurasi GPS & Radius ke Kantor Resmi
  const validation = await locationService.validateGpsAndRadius(latitude, longitude, accuracy);

  // 2. Cek apakah siswa sudah melakukan presensi hari ini
  const todayDate = new Date().toISOString().split("T")[0];
  const { data: existing, error: checkError } = await supabaseAdmin
    .from("attendance")
    .select("id, check_in_time")
    .eq("user_id", userId)
    .eq("attendance_date", todayDate)
    .maybeSingle();

  if (checkError) {
    throw {
      statusCode: 500,
      code: "QUERY_ERROR",
      message: "Gagal memeriksa status kehadiran.",
      details: checkError.message,
    };
  }

  if (existing) {
    throw {
      statusCode: 400,
      code: "ALREADY_CHECKED_IN",
      message: "Anda sudah melakukan presensi check-in untuk hari ini.",
      details: {
        attendance_id: existing.id,
        check_in_time: existing.check_in_time,
      },
    };
  }

  // 3. Upload foto selfie jika dikirim dalam bentuk base64 / file
  let finalPhotoPath = photo_path || "attendance-photos/default-placeholder.jpg";
  const photoInput = payload.photo || payload.photo_base64;
  if (photoInput) {
    const uploadResult = await storageService.uploadAttendancePhoto(userId, photoInput, "check-in");
    finalPhotoPath = uploadResult.url || uploadResult.path;
  }

  // 4. Simpan data presensi check-in ke tabel attendance
  const insertPayload = {
    user_id: userId,
    location_id: validation.location?.id || null,
    attendance_date: todayDate,
    check_in_time: new Date().toISOString(),
    check_in_latitude: parseFloat(latitude),
    check_in_longitude: parseFloat(longitude),
    check_in_accuracy: parseFloat(accuracy),
    check_in_distance: validation.distance,
    check_in_photo_path: finalPhotoPath,
    status: "CHECKED_IN",
  };

  const { data: createdAttendance, error: insertError } = await supabaseAdmin
    .from("attendance")
    .insert([insertPayload])
    .select()
    .single();

  if (insertError) {
    throw {
      statusCode: 500,
      code: "INSERT_ERROR",
      message: "Gagal menyimpan data presensi check-in.",
      details: insertError.message,
    };
  }

  // 5. Kirim notifikasi log ke Telegram Bot (Asynchronous / Non-blocking)
  (async () => {
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, nisn, school, major")
        .eq("id", userId)
        .maybeSingle();

      await telegramService.sendAttendanceLog({
        student: profile || {},
        type: "CHECK_IN",
        time: createdAttendance.check_in_time,
        distance: createdAttendance.check_in_distance,
        accuracy: createdAttendance.check_in_accuracy,
        locationName: validation.location?.name,
        photoUrl: finalPhotoPath,
      });
    } catch (err) {
      console.warn("[TELEGRAM LOG WARNING]", err.message);
    }
  })();

  return createdAttendance;
}

/**
 * Melakukan presensi pulang (Check-out)
 * @param {string} userId 
 * @param {object} payload - { latitude, longitude, accuracy, photo_path }
 */
async function checkOut(userId, payload) {
  const { latitude, longitude, accuracy, photo_path } = payload;

  if (latitude === undefined || longitude === undefined || accuracy === undefined) {
    throw {
      statusCode: 400,
      code: "MISSING_LOCATION_DATA",
      message: "Data koordinat (latitude, longitude, dan accuracy) wajib disertakan.",
    };
  }

  if (!supabaseAdmin) {
    throw {
      statusCode: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Layanan Supabase belum dikonfigurasi.",
    };
  }

  // 1. Validasi Akurasi GPS & Radius ke Kantor Resmi
  const validation = await locationService.validateGpsAndRadius(latitude, longitude, accuracy);

  // 2. Cek apakah siswa sudah check-in hari ini
  const todayDate = new Date().toISOString().split("T")[0];
  const { data: existing, error: checkError } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("attendance_date", todayDate)
    .maybeSingle();

  if (checkError) {
    throw {
      statusCode: 500,
      code: "QUERY_ERROR",
      message: "Gagal memeriksa status kehadiran.",
      details: checkError.message,
    };
  }

  if (!existing) {
    throw {
      statusCode: 400,
      code: "NOT_CHECKED_IN",
      message: "Anda belum melakukan presensi masuk (check-in) hari ini.",
    };
  }

  if (existing.check_out_time) {
    throw {
      statusCode: 400,
      code: "ALREADY_CHECKED_OUT",
      message: "Anda sudah melakukan presensi pulang (check-out) hari ini.",
      details: {
        check_out_time: existing.check_out_time,
      },
    };
  }

  // 3. Upload foto selfie pulang jika dikirim dalam bentuk base64 / file
  let finalPhotoPath = photo_path || existing.check_in_photo_path;
  const photoInput = payload.photo || payload.photo_base64;
  if (photoInput) {
    const uploadResult = await storageService.uploadAttendancePhoto(userId, photoInput, "check-out");
    finalPhotoPath = uploadResult.url || uploadResult.path;
  }

  // 4. Update baris absensi hari ini dengan data check-out
  const updatePayload = {
    check_out_time: new Date().toISOString(),
    check_out_latitude: parseFloat(latitude),
    check_out_longitude: parseFloat(longitude),
    check_out_accuracy: parseFloat(accuracy),
    check_out_distance: validation.distance,
    check_out_photo_path: finalPhotoPath,
    status: "COMPLETED",
  };

  const { data: updatedAttendance, error: updateError } = await supabaseAdmin
    .from("attendance")
    .update(updatePayload)
    .eq("id", existing.id)
    .select()
    .single();

  if (updateError) {
    throw {
      statusCode: 500,
      code: "UPDATE_ERROR",
      message: "Gagal memperbarui data presensi check-out.",
      details: updateError.message,
    };
  }

  // 5. Kirim notifikasi log ke Telegram Bot (Asynchronous / Non-blocking)
  (async () => {
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, nisn, school, major")
        .eq("id", userId)
        .maybeSingle();

      await telegramService.sendAttendanceLog({
        student: profile || {},
        type: "CHECK_OUT",
        time: updatedAttendance.check_out_time,
        distance: updatedAttendance.check_out_distance,
        accuracy: updatedAttendance.check_out_accuracy,
        locationName: validation.location?.name,
        photoUrl: finalPhotoPath,
      });
    } catch (err) {
      console.warn("[TELEGRAM LOG WARNING]", err.message);
    }
  })();

  return updatedAttendance;
}

/**
 * Mengambil riwayat presensi milik siswa yang login
 * @param {string} userId 
 * @param {object|number} options - { limit, start_date, end_date } atau limit angka
 */
async function getAttendanceHistory(userId, options = {}) {
  if (!supabaseAdmin) {
    throw {
      statusCode: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Layanan Supabase belum dikonfigurasi.",
    };
  }

  const filterOpts = typeof options === "object" ? options : { limit: options };
  const limit = Math.min(parseInt(filterOpts.limit, 10) || 30, 100);

  let query = supabaseAdmin
    .from("attendance")
    .select("*, locations(name)")
    .eq("user_id", userId);

  if (filterOpts.start_date) {
    query = query.gte("attendance_date", filterOpts.start_date);
  }
  if (filterOpts.end_date) {
    query = query.lte("attendance_date", filterOpts.end_date);
  }

  query = query
    .order("attendance_date", { ascending: false })
    .order("check_in_time", { ascending: false })
    .limit(limit);

  const { data, error } = await query;

  if (error) {
    throw {
      statusCode: 500,
      code: "QUERY_ERROR",
      message: "Gagal memuat riwayat presensi.",
      details: error.message,
    };
  }

  return data || [];
}

/**
 * Mengambil detail presensi berdasarkan ID
 * @param {string} attendanceId 
 * @param {string} userId 
 * @param {boolean} isAdmin 
 */
async function getAttendanceById(attendanceId, userId, isAdmin = false) {
  if (!supabaseAdmin) {
    throw {
      statusCode: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Layanan Supabase belum dikonfigurasi.",
    };
  }

  let query = supabaseAdmin
    .from("attendance")
    .select("*, profiles(full_name, email, nisn, school, major), locations(name)")
    .eq("id", attendanceId);

  // Jika bukan admin, hanya bisa melihat presensi miliknya sendiri
  if (!isAdmin) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    throw {
      statusCode: 404,
      code: "ATTENDANCE_NOT_FOUND",
      message: "Data presensi tidak ditemukan atau Anda tidak memiliki izin untuk melihatnya.",
    };
  }

  return data;
}

module.exports = {
  getTodayAttendance,
  checkIn,
  checkOut,
  getAttendanceHistory,
  getAttendanceById,
};
