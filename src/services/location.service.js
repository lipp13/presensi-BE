const { supabaseAdmin } = require("../config/supabase");

/**
 * Service untuk perhitungan geospasial dan validasi lokasi GPS presensi
 */

/**
 * Menghitung jarak antara dua koordinat geografis dalam satuan meter menggunakan Haversine Formula.
 * @param {number} lat1 - Latitude titik 1 (User)
 * @param {number} lon1 - Longitude titik 1 (User)
 * @param {number} lat2 - Latitude titik 2 (Kantor)
 * @param {number} lon2 - Longitude titik 2 (Kantor)
 * @returns {number} Jarak dalam meter
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius rata-rata bumi dalam meter
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c * 100) / 100;
}

/**
 * Mengambil data titik lokasi kantor aktif dari database atau fallback ke environment variables
 */
async function getActiveOfficeLocation() {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("locations")
        .select("id, name, latitude, longitude, radius_meters, is_active")
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          radius_meters: parseInt(data.radius_meters, 10),
        };
      }
    }
  } catch (err) {
    console.warn("[LOCATION SERVICE] Gagal mengambil lokasi dari DB, beralih ke konfigurasi .env:", err.message);
  }

  // Fallback default konfigurasi Balai SDA
  return {
    id: null,
    name: process.env.OFFICE_NAME || "Direktorat Bina Teknik Sumber Daya Air",
    latitude: parseFloat(process.env.OFFICE_LATITUDE) || -6.89938,
    longitude: parseFloat(process.env.OFFICE_LONGITUDE) || 107.61861,
    radius_meters: parseInt(process.env.OFFICE_RADIUS_METERS, 10) || 100,
  };
}

/**
 * Validasi akurasi GPS dan jarak radius ke kantor resmi
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {number} accuracy 
 */
async function validateGpsAndRadius(latitude, longitude, accuracy) {
  const parsedLat = parseFloat(latitude);
  const parsedLng = parseFloat(longitude);
  const parsedAccuracy = parseFloat(accuracy);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    throw {
      statusCode: 400,
      code: "INVALID_COORDINATES",
      message: "Koordinat latitude dan longitude tidak valid.",
    };
  }

  // Validasi rentang koordinat geografis bumi
  if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
    throw {
      statusCode: 400,
      code: "COORDINATES_OUT_OF_RANGE",
      message: "Koordinat latitude harus antara -90 dan 90, dan longitude antara -180 dan 180.",
    };
  }

  // 1. Validasi Toleransi Akurasi GPS & Deteksi Anomali Fake GPS
  const maxAccuracy = parseInt(process.env.MAX_GPS_ACCURACY_METERS, 10) || 50;

  // Akurasi <= 0 merupakan anomali umum dari generator Fake GPS
  if (!isNaN(parsedAccuracy) && parsedAccuracy <= 0) {
    throw {
      statusCode: 400,
      code: "SUSPECTED_FAKE_GPS",
      message: "Nilai akurasi GPS tidak valid atau terindikasi penggunaan mock location/Fake GPS.",
      details: { accuracy: parsedAccuracy },
    };
  }

  if (!isNaN(parsedAccuracy) && parsedAccuracy > maxAccuracy) {
    throw {
      statusCode: 400,
      code: "GPS_ACCURACY_TOO_LOW",
      message: `Akurasi sinyal GPS perangkat Anda terlalu rendah (±${parsedAccuracy} meter). Batas toleransi maksimal adalah ${maxAccuracy} meter. Silakan coba di ruang terbuka atau pastikan GPS HP Anda aktif dengan mode akurasi tinggi.`,
      details: {
        accuracy: parsedAccuracy,
        max_allowed_accuracy: maxAccuracy,
      },
    };
  }

  // 2. Ambil data titik kantor resmi
  const office = await getActiveOfficeLocation();

  // 3. Hitung jarak pengguna ke kantor menggunakan Haversine Formula
  const distance = calculateDistanceMeters(
    parsedLat,
    parsedLng,
    office.latitude,
    office.longitude
  );

  // 4. Validasi apakah jarak berada di dalam radius yang diizinkan
  if (distance > office.radius_meters) {
    throw {
      statusCode: 400,
      code: "LOCATION_OUT_OF_RANGE",
      message: `Presensi ditolak. Lokasi Anda berada di luar radius kantor presensi. Jarak Anda saat ini: ${distance} meter (Batas radius maksimal: ${office.radius_meters} meter).`,
      details: {
        current_distance_meters: distance,
        max_radius_meters: office.radius_meters,
        office_name: office.name,
      },
    };
  }

  return {
    valid: true,
    distance,
    location: office,
  };
}

module.exports = {
  calculateDistanceMeters,
  getActiveOfficeLocation,
  validateGpsAndRadius,
};
