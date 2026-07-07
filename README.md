# Ajuan Pembayaran

Aplikasi operasional untuk input ajuan pembayaran, upload bukti transfer, upload LPJ, audit trail, import data lama, dashboard cek ajuan, dan export rekap Excel.

## Stack Baru

- Frontend/backend: Next.js App Router, TypeScript, Tailwind CSS
- Database production: PostgreSQL
- Storage production: Vercel Blob
- Import/export: XLSX
- Test: Vitest

## Fitur

- Input ajuan dengan validasi wajib/opsional.
- Nama Pengaju terpisah dari Atas Nama Rekening.
- Upload Bukti TF otomatis mengubah status menjadi `Selesai Dibayar`.
- Upload LPJ dengan input realisasi.
- Hitung otomatis selisih dana dan status `Surplus`, `Defisit`, atau `Sesuai`.
- Dashboard cek ajuan berisi KPI cards, breakdown status, tren bulanan, top cabang, filter, dan tabel.
- Edit dan hapus ajuan dengan konfirmasi.
- Audit trail perubahan.
- Import Excel/CSV, termasuk sheet `Kegiatan` dan layout KPI lama.
- Export rekap ke Excel.

## Struktur Penting

```text
D:\Ajuan
├── src\
│   ├── app\              # Pages, route handlers, layout
│   ├── components\       # Komponen UI reusable
│   └── lib\              # DB, domain logic, import, storage, actions
├── scripts\              # Migrasi Postgres dan migrasi data SQLite
├── public\uploads\       # File lokal saat development saja
├── script\               # Aplikasi Flask lama, disimpan sebagai legacy
└── ajuan_pembayaran\     # SQLite lama
```

## Environment

Buat file `.env.local` dari `.env.example`.

```powershell
cd D:\Ajuan
copy .env.example .env.local
```

Isi minimal:

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB?sslmode=require
BLOB_READ_WRITE_TOKEN=
APP_ADMIN_USER=
APP_ADMIN_PASS=
APP_DIRKEU_USER=
APP_DIRKEU_PASS=
APP_SESSION_TOKEN=
```

Catatan:
- `DATABASE_URL` wajib untuk production.
- `BLOB_READ_WRITE_TOKEN` wajib kalau upload file di Vercel.
- `APP_ADMIN_USER` dan `APP_ADMIN_PASS` dipakai untuk login admin.
- `APP_DIRKEU_USER` dan `APP_DIRKEU_PASS` dipakai untuk login Dirkeu.
- `APP_SESSION_TOKEN` opsional, tapi disarankan untuk mengontrol invalidasi session lintas role.
- Jika `BLOB_READ_WRITE_TOKEN` kosong saat local dev, file disimpan ke `public/uploads`.
- Di production, file diupload sebagai Vercel Blob `private` dan dibuka lewat route internal `/api/files/...`.

## Command Local

```powershell
cd D:\Ajuan
npm install
npm run migrate
npm run dev
```

Buka:

```text
http://localhost:3000
```

Atau double click:

```text
D:\Ajuan\Jalankan-Ajuan-App-dengan-Browser.bat
```

## Migrasi Data Lama SQLite ke Postgres

1. Export SQLite lama ke JSON:

```powershell
cd D:\Ajuan
npm run export:sqlite
```

2. Pastikan `.env.local` sudah berisi `DATABASE_URL`.

3. Buat schema Postgres:

```powershell
npm run migrate
```

4. Import JSON ke Postgres:

```powershell
npm run import:json
```

Jika file JSON ada di lokasi lain:

```powershell
npm run import:json -- D:\path\migration-export-ajuan.json
```

## Deploy ke Vercel

1. Buat database PostgreSQL, misalnya Supabase atau Neon.
2. Buat Vercel Blob store dan ambil `BLOB_READ_WRITE_TOKEN`.
3. Tambahkan environment variables di Vercel:

```env
DATABASE_URL=...
BLOB_READ_WRITE_TOKEN=...
```

4. Deploy:

```powershell
cd D:\Ajuan
npm install
npm run test
npm run typecheck
npm run build
vercel
vercel --prod
```

5. Jalankan migrasi schema ke database production.

Untuk workflow approval Dirkeu, jalankan juga SQL berikut di Supabase SQL Editor atau lewat koneksi Postgres:

```text
scripts/sql/2026-06-18-dirkeu-approval.sql
```

Jika memakai `DATABASE_URL`, migrasi dasar tetap bisa dijalankan dengan:

```powershell
vercel env pull .env.production.local
$env:DATABASE_URL=(Get-Content .env.production.local | Select-String "DATABASE_URL").ToString().Split("=",2)[1]
npm run migrate
```

Alternatif yang lebih rapi:

```powershell
vercel env run -- npm run migrate
```

## Backup dan Restore

Backup Postgres disarankan melalui dashboard provider database.

Backup data operasional dari aplikasi:

```text
Dashboard Cek Ajuan -> Export Excel
```

Restore/migrasi bulk:

```text
Import Sheet -> upload XLSX/CSV sesuai template
```

## API Automation

Upload bukti transfer:

```http
POST /api/ajuan/{id_ajuan}/bukti
form-data:
  file = bukti.jpg/pdf
```

Upload LPJ:

```http
POST /api/ajuan/{id_ajuan}/lpj
form-data:
  file = lpj.jpg/pdf
  nominal_realisasi = 1500000
```

## Troubleshooting

- `DATABASE_URL wajib diisi`: isi `.env.local` atau env Vercel.
- Upload gagal di production: pastikan `BLOB_READ_WRITE_TOKEN` sudah diisi.
- Tabel belum ada: jalankan `npm run migrate`.
- Login Dirkeu tidak bisa: pastikan `APP_DIRKEU_USER` dan `APP_DIRKEU_PASS` sudah diisi di environment.
- Halaman review Dirkeu error kolom tidak ditemukan: jalankan `scripts/sql/2026-06-18-dirkeu-approval.sql` di database production.
- Import nama salah: untuk sheet `Kegiatan`, kolom `Rekening an.` akan masuk ke `Atas Nama Rekening`, sedangkan `Nama Pengaju` default `-`.
- Build gagal karena dependency belum ada: jalankan `npm install` ulang.

## Checklist Pasca Deploy

- Buka `/api/health` dan pastikan `ok: true`.
- Buka `/cek-ajuan`, pastikan dashboard tampil.
- Input satu ajuan dummy.
- Upload bukti TF dan cek status berubah `Selesai Dibayar`.
- Upload LPJ dengan realisasi dan cek status dana.
- Export Excel dan buka hasilnya.
- Hapus data dummy dari halaman edit.
