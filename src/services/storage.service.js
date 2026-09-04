const { supabaseAdmin } = require("../config/supabase");

const BUCKET_NAME = "attendance-photos";

/**
 * Service untuk menangani upload dan pengelolaan foto presensi di Supabase Storage
 */

/**
 * Mengunggah foto presensi siswa ke Supabase Storage
 * Struktur folder: attendance-photos/{user_id}/{tanggal}/{checkType}-{timestamp}.jpg
 * 
 * @param {string} userId - ID Pengguna (UUID)
 * @param {string} photoInput - Base64 string atau path URL foto
 * @param {'check-in'|'check-out'} checkType - Tipe presensi
 * @returns {Promise<{path: string, url: string}>}
 */
async function uploadAttendancePhoto(userId, photoInput, checkType = "check-in") {
  if (!photoInput) {
    throw {
      statusCode: 400,
      code: "PHOTO_REQUIRED",
      message: "Foto selfie presensi wajib disertakan.",
    };
  }

  // Jika photoInput sudah merupakan URL http/https atau path tersimpan, kembalikan langsung
  if (photoInput.startsWith("http://") || photoInput.startsWith("https://") || photoInput.startsWith("attendance-photos/")) {
    return {
      path: photoInput,
      url: photoInput,
    };
  }

  if (!supabaseAdmin) {
    throw {
      statusCode: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Layanan Supabase Storage belum dikonfigurasi.",
    };
  }

  // 1. Ekstrak data base64 dan format gambar
  let mimeType = "image/jpeg";
  let extension = "jpg";
  let base64Data = photoInput;

  const matches = photoInput.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches) {
    mimeType = matches[1];
    base64Data = matches[2];
    if (mimeType.includes("png")) extension = "png";
    else if (mimeType.includes("webp")) extension = "webp";
  }

  const fileBuffer = Buffer.from(base64Data, "base64");

  // 2. Validasi ukuran foto (maksimal 5MB)
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (fileBuffer.length > MAX_SIZE) {
    throw {
      statusCode: 400,
      code: "PHOTO_TOO_LARGE",
      message: "Ukuran foto terlalu besar. Maksimal ukuran foto adalah 5MB.",
      details: {
        size_bytes: fileBuffer.length,
        max_bytes: MAX_SIZE,
      },
    };
  }

  // 3. Susun path folder terstruktur sesuai spesifikasi proyek
  const todayDate = new Date().toISOString().split("T")[0];
  const fileName = `${checkType}-${Date.now()}.${extension}`;
  const filePath = `${userId}/${todayDate}/${fileName}`;

  // 4. Upload ke Supabase Storage
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("[STORAGE ERROR] Gagal mengunggah foto:", error);
    throw {
      statusCode: 500,
      code: "STORAGE_UPLOAD_ERROR",
      message: "Gagal mengunggah foto presensi ke server storage.",
      details: error.message,
    };
  }

  // 5. Dapatkan Public URL
  const { data: publicUrlData } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    path: filePath,
    url: publicUrlData?.publicUrl || filePath,
  };
}

module.exports = {
  uploadAttendancePhoto,
  BUCKET_NAME,
};
