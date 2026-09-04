/**
 * Service untuk mengirimkan log notifikasi presensi secara real-time ke Telegram Bot
 * Menggunakan native fetch Node.js tanpa dependensi tambahan
 */

/**
 * Mengirim pesan teks terformat (HTML) ke Telegram Chat / Group
 * @param {string} text 
 */
async function sendMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // Jika token atau chat id belum diisi di .env, lewati secara aman
  if (!token || !chatId) {
    return null;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.warn("[TELEGRAM BOT WARNING] Gagal mengirim pesan ke Telegram:", data.description);
    }
    return data;
  } catch (err) {
    console.error("[TELEGRAM BOT ERROR]", err.message);
    return null;
  }
}

/**
 * Mengirimkan log kehadiran (Check-in atau Check-out) ke Telegram
 * @param {object} params
 */
async function sendAttendanceLog({
  student = {},
  type = "CHECK_IN",
  time,
  distance,
  accuracy,
  locationName,
  photoUrl,
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return null;
  }

  const isCheckIn = type === "CHECK_IN";
  const titleEmoji = isCheckIn ? "🟢" : "🔴";
  const typeText = isCheckIn ? "PRESENSI MASUK (CHECK-IN)" : "PRESENSI PULANG (CHECK-OUT)";

  const dateObj = time ? new Date(time) : new Date();
  const timeFormatted =
    dateObj.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";
  const dateFormatted = dateObj.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Jakarta",
  });

  let message = `<b>${titleEmoji} [LOG ${typeText}]</b>\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `👤 <b>Nama</b>    : ${student.full_name || "Siswa PKL"}\n`;
  if (student.nisn) {
    message += `🆔 <b>NISN</b>    : <code>${student.nisn}</code>\n`;
  }
  message += `🏫 <b>Sekolah</b> : ${student.school || "SMK Taruna Bhakti"}\n`;
  if (student.major) {
    message += `📚 <b>Jurusan</b> : ${student.major}\n`;
  }
  message += `⏰ <b>Waktu</b>   : ${timeFormatted}\n`;
  message += `📅 <b>Tanggal</b> : ${dateFormatted}\n`;
  message += `📍 <b>Jarak</b>   : ${distance != null ? distance + " meter" : "-"}\n`;
  message += `📡 <b>Akurasi</b> : ±${accuracy != null ? accuracy + " meter" : "-"}\n`;
  message += `🏢 <b>Lokasi</b>  : ${locationName || "Direktorat Bina Teknik Sumber Daya Air"}\n`;

  if (photoUrl && (photoUrl.startsWith("http://") || photoUrl.startsWith("https://"))) {
    message += `📸 <b>Foto</b>    : <a href="${photoUrl}">Lihat Foto Presensi</a>\n`;
  }
  message += `━━━━━━━━━━━━━━━━━━━━━`;

  return await sendMessage(message);
}

/**
 * Menguji koneksi bot Telegram dan mengirim pesan uji coba
 */
async function testTelegramConnection() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return {
      success: false,
      message: "TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diisi di file .env",
    };
  }

  const testMessage = `🤖 <b>TEST KONEKSI TELEGRAM BOT PRENSENSI PKL</b>\n\n✅ <i>Koneksi Berhasil!</i>\nBackend Presensi Siswa PKL SMK Taruna Bhakti di Direktorat Bina Teknik Sumber Daya Air siap mengirimkan log real-time ke chat ini.`;

  const result = await sendMessage(testMessage);
  if (result && result.ok) {
    return {
      success: true,
      message: "Pesan uji coba berhasil terkirim ke Telegram Anda!",
      data: result.result,
    };
  }

  return {
    success: false,
    message: result?.description || "Gagal mengirim pesan ke Telegram. Pastikan Anda sudah klik START pada bot di Telegram.",
    details: result,
  };
}

module.exports = {
  sendMessage,
  sendAttendanceLog,
  testTelegramConnection,
};
