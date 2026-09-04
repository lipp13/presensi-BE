# Panduan Kontribusi — Backend Presensi PKL

Selamat datang di repositori Backend Sistem Presensi PKL SMK Taruna Bhakti! Dokumen ini memuat standar penulisan kode, alur Git branching, dan tata cara pengujian bagi seluruh anggota tim pengembang.

---

## 🌿 1. Model Branching Git

Kami menggunakan alur branch terstruktur:
* `main` : Branch produksi stabil dan siap deployment.
* `alif` : Branch developer pengembang backend (Alif Alfathar).
* `dennis` : Branch developer pengembang backend (Dennis Ali).
* `rega` : Branch developer pengembang backend (Rega Syakib).

### Alur Kerja Harian:
1. Pastikan selalu melakukan `git pull origin (nama branch)` sebelum memulai pekerjaan.
2. Kerjakan tugas sesuai modul pada dokumen WBS.
3. Jalankan automated test:
   ```bash
   npm test
   ```
4. Pastikan **15/15 test cases berstatus PASS** sebelum melakukan commit.

---

## 💬 2. Standar Pesan Commit (Conventional Commits)

Gunakan format commit standar:
```text
<tipe>(<lingkup>): <deskripsi singkat dalam huruf kecil>
```

### Tipe Commit yang Didukung:
* `feat` : Fitur baru (contoh: `feat(auth): support login via NISN`)
* `fix` : Perbaikan bug (contoh: `fix(location): resolve haversine negative latitude`)
* `docs` : Penambahan/pembaruan dokumentasi (contoh: `docs: update API endpoints table`)
* `test` : Menambah atau memperbaiki unit test (contoh: `test: add automated test for NISN validation`)
* `refactor` : Penataan ulang kode tanpa mengubah fungsionalitas (contoh: `refactor(utils): standardize error codes`)
* `chore` : Pemeliharaan dependensi atau konfigurasi tooling (contoh: `chore: update dependencies`)
* `ci` : Pembaruan file workflow CI/CD GitHub Actions (contoh: `ci: add automated testing workflow`)

---

## 🧪 3. Tata Cara Pengujian Lokal

Sebelum push ke GitHub:
1. Pastikan server dev dapat berjalan tanpa crash:
   ```bash
   npm run dev
   ```
2. Jalankan test otomatis:
   ```bash
   npm test
   ```
3. Lakukan verifikasi manual menggunakan **Thunder Client**:
   * Import file `thunder-client-collection.json` ke ekstensi Thunder Client di VS Code.
   * Lakukan tes menyeluruh pada endpoint Auth, Presensi, dan Admin.

---

## 👥 4. Tim Pengembang Backend
* **Alif Alfathar** — Lead Developer & Backend Architect
* **Rega Syakib** — Backend & Database Engineer
* **Denis Ali** — Backend & QA Engineer
