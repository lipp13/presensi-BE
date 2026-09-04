# Backend Project PKL

Backend untuk aplikasi Project PKL. Aplikasi ini dibangun menggunakan **Node.js**, **Express**, dan **Supabase**.

## Teknologi

- Node.js
- Express
- Supabase
- CORS
- dotenv

## Persiapan

Pastikan perangkat sudah memiliki:

- Node.js dan npm
- Akun serta project Supabase

## Instalasi

1. Masuk ke folder backend:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Buat file `.env` di dalam folder `backend`:

   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   PORT=3000
   ```

   Gunakan nilai URL dan key dari pengaturan API project Supabase.

## Menjalankan Server

Jalankan server dengan perintah:

```bash
node index.js
```

Untuk menjalankan server dalam mode development dengan Nodemon:

```bash
npx nodemon index.js
```

Server dapat diakses melalui `http://localhost:3000` atau port yang ditentukan pada file `.env`.

## Struktur Folder

```text
backend/
├── .env
├── index.js
├── package.json
├── package-lock.json
└── README.md
```

## Catatan

- Jangan mengunggah file `.env` ke repository.
- Pastikan tabel dan policy yang dibutuhkan sudah dibuat di Supabase.
- Dokumentasi endpoint dapat ditambahkan setelah API tersedia.
