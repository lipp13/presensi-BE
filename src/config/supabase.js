const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validasi keberadaan environment variable
const isConfigured = Boolean(supabaseUrl && (supabaseAnonKey || supabaseServiceRoleKey));

if (!isConfigured) {
  console.warn(
    "[SUPABASE WARNING] Variabel SUPABASE_URL atau SUPABASE_ANON_KEY belum diisi di file .env. Pastikan Anda mengisi kredensial Supabase."
  );
}

// Client untuk operasi publik / autentikasi user (anon key)
const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey || supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

// Client dengan hak istimewa tinggi / bypass RLS (service role key, hanya untuk internal backend)
const supabaseAdmin = isConfigured && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : supabase;

/**
 * Fungsi untuk memeriksa koneksi ke Supabase
 * @returns {Promise<{connected: boolean, message: string}>}
 */
async function testConnection() {
  if (!isConfigured) {
    return {
      connected: false,
      message: "Kredensial Supabase (URL / Key) belum dikonfigurasi pada .env",
    };
  }

  try {
    // Memanggil endpoint auth atau memeriksa session untuk memastikan URL dan Key valid
    const { error } = await supabase.auth.getSession();
    if (error) {
      return {
        connected: false,
        message: `Koneksi Supabase gagal: ${error.message}`,
      };
    }

    return {
      connected: true,
      message: "Koneksi ke Supabase berhasil terhubung",
    };
  } catch (err) {
    return {
      connected: false,
      message: `Terjadi kendala jaringan/koneksi: ${err.message}`,
    };
  }
}

module.exports = {
  supabase,
  supabaseAdmin,
  isConfigured,
  testConnection,
};
