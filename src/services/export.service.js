const ExcelJS = require("exceljs");

/**
 * Service untuk generate file Excel (.xlsx) rekapitulasi presensi siswa PKL
 * Menggunakan format tabel resmi dengan penataan sel dan warna profesional
 */
async function generateAttendanceExcel(attendanceRecords = []) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Presensi PKL - SMK Taruna Bhakti";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Rekap Presensi PKL", {
    views: [{ showGridLines: true }],
  });

  // 1. Header Judul Laporan
  worksheet.mergeCells("A1:M1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "REKAPITULASI PRESENSI SISWA PKL";
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF1E3A8A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells("A2:M2");
  const subtitleCell = worksheet.getCell("A2");
  subtitleCell.value = "DIREKTORAT BINA TEKNIK SUMBER DAYA AIR - SMK TARUNA BHAKTI";
  subtitleCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF475569" } };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.addRow([]); // Baris kosong pemisah

  // 2. Baris Header Tabel
  const headerRow = worksheet.addRow([
    "No",
    "Tanggal",
    "Nama Siswa",
    "NISN",
    "Sekolah",
    "Jurusan",
    "Jam Masuk",
    "Jarak Masuk (m)",
    "Foto Masuk (URL)",
    "Jam Pulang",
    "Jarak Pulang (m)",
    "Foto Pulang (URL)",
    "Status Kehadiran",
  ]);

  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1D4ED8" }, // Primary Navy/Blue
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // 3. Masukkan Data Rekap Presensi
  attendanceRecords.forEach((item, index) => {
    const student = item.profiles || {};
    const checkInTimeStr = item.check_in_time
      ? new Date(item.check_in_time).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })
      : "-";
    const checkOutTimeStr = item.check_out_time
      ? new Date(item.check_out_time).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })
      : "-";

    const row = worksheet.addRow([
      index + 1,
      item.attendance_date,
      student.full_name || "-",
      student.nisn || "-",
      student.school || "SMK Taruna Bhakti",
      student.major || "-",
      checkInTimeStr,
      item.check_in_distance != null ? `${item.check_in_distance} m` : "-",
      item.check_in_photo_path || "-",
      checkOutTimeStr,
      item.check_out_distance != null ? `${item.check_out_distance} m` : "-",
      item.check_out_photo_path || "-",
      item.status === "COMPLETED" ? "Hadir Lengkap" : "Masuk (Belum Pulang)",
    ]);

    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Calibri", size: 9 };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      // Format alignment kolom
      if ([1, 2, 4, 7, 8, 10, 11, 13].includes(colNumber)) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.alignment = { vertical: "middle" };
      }
    });
  });

  // 4. Lebar Kolom Otomatis
  worksheet.columns = [
    { width: 6 },  // No
    { width: 14 }, // Tanggal
    { width: 28 }, // Nama
    { width: 16 }, // NISN
    { width: 22 }, // Sekolah
    { width: 22 }, // Jurusan
    { width: 14 }, // Jam Masuk
    { width: 16 }, // Jarak Masuk
    { width: 32 }, // Foto Masuk
    { width: 14 }, // Jam Pulang
    { width: 16 }, // Jarak Pulang
    { width: 32 }, // Foto Pulang
    { width: 24 }, // Status
  ];

  return await workbook.xlsx.writeBuffer();
}

module.exports = {
  generateAttendanceExcel,
};
