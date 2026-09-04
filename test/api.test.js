/**
 * Automated Test Suite untuk Presensi PKL Backend
 * Menjalankan validasi endpoint, algoritma geospasial, anti-cheat, dan format respons
 */

const http = require("http");
const app = require("../src/app");
const locationService = require("../src/services/location.service");
const exportService = require("../src/services/export.service");

let server;
const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}`;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${testName}`);
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("🧪 Memulai Pengujian Otomatis Backend Presensi PKL");
  console.log("==================================================");

  // 1. Jalankan server sementara untuk testing
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });

  try {
    // -------------------------------------------------------------
    console.log("\n[1] Pengujian Endpoint Dasar & Response Standard");
    // -------------------------------------------------------------
    const rootRes = await (await fetch(`${BASE_URL}/`)).json();
    assert(rootRes.success === true && rootRes.data.version === "1.0.0", "GET / mengembalikan status 200 dengan format standar");

    const healthRes = await (await fetch(`${BASE_URL}/api/health`)).json();
    assert(healthRes.success === true && healthRes.data.status === "OK", "GET /api/health mengembalikan status sistem aktif");

    const notFoundRes = await (await fetch(`${BASE_URL}/api/random-route-xyz`)).json();
    assert(notFoundRes.success === false && notFoundRes.error.code === "ROUTE_NOT_FOUND", "GET /api/random-route-xyz ditangani 404 ROUTE_NOT_FOUND");

    // -------------------------------------------------------------
    console.log("\n[2] Pengujian Validasi Auth Endpoint");
    // -------------------------------------------------------------
    const emptyLoginRes = await (
      await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    ).json();
    assert(emptyLoginRes.success === false && emptyLoginRes.error.code === "VALIDATION_ERROR", "POST /api/auth/login tanpa body ditolak VALIDATION_ERROR");

    const nisnOnlyLoginRes = await (
      await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nisn: "242510046" }),
      })
    ).json();
    assert(nisnOnlyLoginRes.success === false && nisnOnlyLoginRes.error.code === "VALIDATION_ERROR", "POST /api/auth/login hanya NISN tanpa password ditolak VALIDATION_ERROR");

    const emptyForgotRes = await (
      await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    ).json();
    assert(emptyForgotRes.success === false && emptyForgotRes.error.code === "VALIDATION_ERROR", "POST /api/auth/forgot-password tanpa body ditolak VALIDATION_ERROR");

    // -------------------------------------------------------------
    console.log("\n[3] Pengujian Proteksi Akses Token (Unauthorized)");
    // -------------------------------------------------------------
    const meNoTokenRes = await (await fetch(`${BASE_URL}/api/auth/me`)).json();
    assert(meNoTokenRes.success === false && meNoTokenRes.error.code === "UNAUTHORIZED", "GET /api/auth/me tanpa token ditolak UNAUTHORIZED");

    const checkInNoTokenRes = await (
      await fetch(`${BASE_URL}/api/attendance/check-in`, { method: "POST" })
    ).json();
    assert(checkInNoTokenRes.success === false && checkInNoTokenRes.error.code === "UNAUTHORIZED", "POST /api/attendance/check-in tanpa token ditolak UNAUTHORIZED");

    const adminTodayNoTokenRes = await (await fetch(`${BASE_URL}/api/admin/attendance/today`)).json();
    assert(adminTodayNoTokenRes.success === false && adminTodayNoTokenRes.error.code === "UNAUTHORIZED", "GET /api/admin/attendance/today tanpa token ditolak UNAUTHORIZED");

    // -------------------------------------------------------------
    console.log("\n[4] Pengujian Anti-Cheat & Validasi Geospasial Haversine");
    // -------------------------------------------------------------
    // Titik kantor Balai SDA
    const officeLat = -6.89938;
    const officeLng = 107.61861;

    // Titik sama persis
    const distZero = locationService.calculateDistanceMeters(officeLat, officeLng, officeLat, officeLng);
    assert(distZero === 0, "Haversine di titik yang sama menghasilkan jarak 0 meter");

    // Titik Monas Jakarta (~118 km)
    const distJakarta = locationService.calculateDistanceMeters(officeLat, officeLng, -6.175392, 106.827153);
    assert(distJakarta > 100000, `Haversine Jakarta-Bandung terhitung presisi (~${Math.round(distJakarta / 1000)} km)`);

    // Anti-cheat: Deteksi akurasi <= 0 (Anomali Fake GPS)
    try {
      await locationService.validateGpsAndRadius(officeLat, officeLng, 0);
      assert(false, "Akurasi 0 meter harus ditolak Fake GPS");
    } catch (err) {
      assert(err.code === "SUSPECTED_FAKE_GPS", "Deteksi anomali Fake GPS berhasil (SUSPECTED_FAKE_GPS saat accuracy <= 0)");
    }

    // Anti-cheat: Akurasi terlalu lemah (> 50m)
    try {
      await locationService.validateGpsAndRadius(officeLat, officeLng, 75);
      assert(false, "Akurasi 75 meter harus ditolak");
    } catch (err) {
      assert(err.code === "GPS_ACCURACY_TOO_LOW", "Akurasi sinyal lemah berhasil ditolak (GPS_ACCURACY_TOO_LOW saat accuracy > 50m)");
    }

    // Anti-cheat: Radius luar kantor
    try {
      await locationService.validateGpsAndRadius(-6.175392, 106.827153, 10);
      assert(false, "Lokasi di Jakarta harus ditolak radius kantor Bandung");
    } catch (err) {
      assert(err.code === "LOCATION_OUT_OF_RANGE", "Lokasi di luar radius kantor berhasil ditolak (LOCATION_OUT_OF_RANGE)");
    }

    // -------------------------------------------------------------
    console.log("\n[5] Pengujian Generator Excel (.xlsx)");
    // -------------------------------------------------------------
    const mockAttendance = [
      {
        attendance_date: "2026-09-04",
        check_in_time: "2026-09-04T08:00:00Z",
        check_in_distance: 25.4,
        check_in_photo_path: "https://supabase.co/storage/p1.jpg",
        check_out_time: "2026-09-04T17:00:00Z",
        check_out_distance: 30.1,
        check_out_photo_path: "https://supabase.co/storage/p2.jpg",
        status: "COMPLETED",
        profiles: {
          full_name: "Alif Alfathar",
          nisn: "1234567890",
          school: "SMK Taruna Bhakti",
          major: "Rekayasa Perangkat Lunak",
        },
      },
    ];

    const excelBuffer = await exportService.generateAttendanceExcel(mockAttendance);
    assert(Buffer.isBuffer(excelBuffer) && excelBuffer.length > 2000, `File Excel .xlsx berhasil di-generate (${excelBuffer.length} bytes)`);

  } catch (error) {
    console.error("Critical Test Failure:", error);
  } finally {
    server.close();
  }

  console.log("\n==================================================");
  console.log(`📊 Hasil Pengujian: ${passedTests}/${totalTests} LULUS (${failedTests} GAGAL)`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
