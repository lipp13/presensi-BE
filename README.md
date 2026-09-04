# Backend API — Presensi Online Siswa PKL

Backend REST API untuk sistem presensi online siswa PKL SMK Taruna Bhakti di **Direktorat Bina Teknik Sumber Daya Air**.

Dibangun menggunakan **Node.js**, **Express.js**, dan **Supabase** (PostgreSQL, Supabase Auth, Supabase Storage).

---

## 1. Teknologi & Arsitektur

* **Runtime**: Node.js (`v20+` / `v24+`)
* **Framework**: Express.js
* **Database & Auth**: Supabase (PostgreSQL, Supabase Auth, Row Level Security)
* **File Storage**: Supabase Storage (`attendance-photos`)
* **Export Engine**: ExcelJS (Spreadsheet `.xlsx`)
* **Geolokasi**: Haversine Formula (Akurasi meter & validasi radius kantor)
* **Arsitektur**: Clean 3-Tier Architecture (Routes ➜ Controllers ➜ Services)

---

## 2. Struktur Direktori

```text
backend/
├── api/
│   └── index.js             # Vercel Serverless Entrypoint
├── database/
│   └── schema.sql           # Skema Lengkap PostgreSQL, Trigger, RLS & Storage
├── src/
│   ├── config/
│   │   └── supabase.js      # Inisialisasi Supabase Client & Admin
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── attendance.controller.js
│   │   └── admin.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── attendance.service.js
│   │   ├── location.service.js
│   │   ├── storage.service.js
│   │   └── export.service.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── attendance.routes.js
│   │   └── admin.routes.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   └── error.middleware.js
│   ├── utils/
│   │   └── response.js      # Standard JSON Response Helper
│   ├── app.js               # Express App Setup & Middlewares
│   └── server.js            # Server Listen & Startup Logger
├── test/
│   └── api.test.js          # Automated Test Suite (14 Tests)
├── .env.example
├── .gitignore
├── package.json
└── vercel.json              # Konfigurasi Deployment Vercel
```

---

## 3. Persiapan & Instalasi

### A. Clone & Install Dependencies
```bash
git clone https://github.com/lipp13/presensi-BE.git
cd presensi-BE/backend
npm install
```

### B. Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isikan nilai variabel sesuai project Supabase Anda:
```env
PORT=5000
NODE_ENV=development

# Supabase API (Dapatkan di Dashboard Supabase -> Project Settings -> API)
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Titik Lokasi Kantor & Toleransi GPS (Configurable)
OFFICE_NAME="Direktorat Bina Teknik Sumber Daya Air"
OFFICE_LATITUDE=-6.899380
OFFICE_LONGITUDE=107.618610
OFFICE_RADIUS_METERS=100
MAX_GPS_ACCURACY_METERS=50
```

### C. Eksekusi Skema Database
1. Buka [Dashboard Supabase](https://supabase.com/dashboard) Anda.
2. Masuk ke menu **SQL Editor** ➜ **New query**.
3. Buka file `database/schema.sql`, copy seluruh isinya dan klik **Run**.

---

## 4. Menjalankan Server & Testing

* **Mode Development**:
  ```bash
  npm run dev
  ```
* **Mode Production**:
  ```bash
  npm start
  ```
* **Menjalankan Automated Test**:
  ```bash
  npm test
  ```

---

## 5. Dokumentasi API untuk Frontend

Format Response Seragam:
* **Sukses**: `{ "success": true, "message": "...", "data": { ... } }`
* **Error**: `{ "success": false, "message": "...", "error": { "code": "..." } }`

### A. Autentikasi (`/api/auth`)
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| `POST` | `/api/auth/login` | Publik | Body: `{ "email": "...", "password": "..." }` |
| `POST` | `/api/auth/forgot-password` | Publik | Body: `{ "email": "..." }` |
| `POST` | `/api/auth/reset-password` | User/Admin | Header: `Bearer <token>`, Body: `{ "password": "..." }` |
| `GET` | `/api/auth/me` | User/Admin | Header: `Bearer <token>` (Data profil pengguna) |

### B. Presensi Siswa (`/api/attendance`)
*Semua endpoint mewajibkan Header: `Authorization: Bearer <access_token>`*

| Method | Endpoint | Keterangan |
|---|---|---|
| `POST` | `/api/attendance/check-in` | Rekam Masuk. Body: `{ "latitude": -6.899, "longitude": 107.618, "accuracy": 15, "photo": "data:image/jpeg;base64,..." }` |
| `POST` | `/api/attendance/check-out` | Rekam Pulang. Body: `{ "latitude": -6.899, "longitude": 107.618, "accuracy": 15, "photo": "data:image/jpeg;base64,..." }` |
| `GET` | `/api/attendance/today` | Cek status kehadiran hari ini (`has_checked_in`, `has_checked_out`) |
| `GET` | `/api/attendance/history` | Riwayat kehadiran siswa. Query: `?start_date=&end_date=&limit=` |
| `GET` | `/api/attendance/:id` | Detail spesifik satu data presensi |

### C. Dashboard & Export Admin (`/api/admin`)
*Mewajibkan Header: `Authorization: Bearer <token>` dan Role: `'admin'`*

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/admin/attendance/today` | Monitoring daftar presensi hari ini |
| `GET` | `/api/admin/attendance/history` | Seluruh riwayat presensi semua siswa (`?page=&limit=&user_id=`) |
| `GET` | `/api/admin/attendance/export` | Download Rekapitulasi Excel (`.xlsx`) |
| `GET` | `/api/admin/students` | Daftar seluruh siswa PKL |
| `POST` | `/api/admin/students` | Tambah siswa baru. Body: `{ "email", "password", "full_name", "nisn", "school", "major" }` |

---

## 6. Anti-Cheat & Keamanan Presensi

1. **Akurasi GPS & Fake GPS**:
   - Jika `accuracy > 50m`, ditolak (`GPS_ACCURACY_TOO_LOW`).
   - Jika `accuracy <= 0`, ditolak (`SUSPECTED_FAKE_GPS` - terindikasi Fake GPS).
2. **Radius Kantor**:
   - Dihitung via Haversine Formula. Jika `jarak > 100m`, ditolak (`LOCATION_OUT_OF_RANGE`).
3. **Waktu Server**:
   - Server tidak mempercayai jam HP pengguna; pencatatan presensi murni menggunakan waktu server/database.
4. **Anti-Duplikasi**:
   - Database constraint `UNIQUE (user_id, attendance_date)` mencegah siswa check-in lebih dari satu kali di hari yang sama.

---

## 7. Deployment ke Vercel

1. Buka [Vercel Dashboard](https://vercel.com).
2. Import repository GitHub: `https://github.com/lipp13/presensi-BE`.
3. Masukkan Root Directory: `backend`.
4. Masukkan Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NODE_ENV=production`
5. Klik **Deploy**. Serverless function Vercel akan otomatis membaca `vercel.json` dan `api/index.js`.
