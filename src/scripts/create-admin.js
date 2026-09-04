require("dotenv").config();
const { supabaseAdmin } = require("../config/supabase");


async function createAdmin() {
  const email = process.argv[2] || "gogod@attend.sch.id";
  const password = process.argv[3] || "gogod123";
  const fullName = process.argv[4] || "Administrator SDA";

  if (!supabaseAdmin) {
    console.error("❌ Error: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di file .env");
    process.exit(1);
  }

  console.log(`⏳ Sedang mendaftarkan akun Admin: ${email}...`);

  try {
    // 1. Buat user di Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "admin",
        school: "Direktorat Bina Teknik Sumber Daya Air",
      },
    });

    if (authError) {
      // Jika email sudah ada di auth, kita bisa langsung update role di tabel profiles
      if (authError.message.toLowerCase().includes("already registered") || authError.message.toLowerCase().includes("exists")) {
        console.log("ℹ️  User sudah terdaftar di Supabase Auth. Mengupdate role menjadi 'admin' di tabel profiles...");
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ role: "admin" })
          .eq("email", email);

        if (updateError) {
          console.error("❌ Gagal mengupdate role:", updateError.message);
          process.exit(1);
        }

        console.log(`✅ Role akun ${email} berhasil diubah menjadi 'admin'!`);
        return;
      }

      console.error("❌ Gagal membuat akun:", authError.message);
      process.exit(1);
    }

    // 2. Pastikan role terisi 'admin' pada tabel profiles
    await supabaseAdmin
      .from("profiles")
      .update({ role: "admin", full_name: fullName })
      .eq("id", authUser.user.id);

    console.log("==================================================");
    console.log("🎉 Akun Admin Berhasil Dibuat!");
    console.log(`📧 Email    : ${email}`);
    console.log(`🔑 Password : ${password}`);
    console.log(`👤 Nama     : ${fullName}`);
    console.log(`🛡️  Role     : admin`);
    console.log("==================================================");
  } catch (err) {
    console.error("❌ Terjadi kesalahan:", err.message);
    process.exit(1);
  }
}

createAdmin();
