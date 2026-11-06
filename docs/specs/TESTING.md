# TESTING.md — Quality Assurance & Verification Strategy

## 1. Gerbang Kualitas Wajib (Quality Gates)
Setiap perubahan kode yang dilakukan oleh pengembang manusia maupun agen otonom **OpenClaw** dilarang digabungkan ke cabang `main` sebelum lulus dua gerbang verifikasi berikut tanpa satupun kesalahan:
```bash
# 1. Pemeriksaan Tipe Statis TypeScript Strict (Wajib 0 Error)
npx tsc --noEmit

# 2. Verifikasi Kompilasi Produksi Next.js 16 App Router
npm run build
```

## 2. Konfigurasi Lingkungan Pengujian (`IS_TESTING_ENV`)
Saat menjalankan rangkaian pengujian otomatis (*automated integration / E2E tests*), aktifkan variabel lingkungan `IS_TESTING_ENV=true`. Konfigurasi ini menonaktifkan sementara pembatas `rate-limiter-flexible` agar pengujian beruntun tidak terblokir oleh respons `429 Too Many Requests`, sembari tetap menjalankan seluruh validasi RBAC, IDOR, dan aturan bisnis lainnya secara penuh.

## 3. Matriks Skenario Pengujian Kritis (Critical Test Suite)

| ID Uji | Nama Skenario | Langkah Pengujian | Hasil yang Diharapkan (Expected Output) |
| :--- | :--- | :--- | :--- |
| **TST-01** | **Anti Double-Booking Race Condition** | Kirim 2 permintaan `POST /api/bookings` secara bersamaan untuk `court_id`, tanggal, dan jam slot yang persis sama. | Permintaan pertama berhasil (`201 Created`, status `waiting_payment`), permintaan kedua ditolak dengan `409 Conflict` dan tercatat di `audit_logs`. |
| **TST-02** | **Pembersihan Tahanan 15 Menit & Smart Waitlist** | Buat pesanan `waiting_payment` dengan waktu `expires_at` di masa lalu, daftarkan 1 nomor WA pada *waitlist* slot tersebut, lalu panggil `GET /api/cron/expire-bookings`. | Status pesanan berubah menjadi `expired`, slot kembali tersedia di `/api/venues`, dan layanan notifikasi memicu pengiriman tautan *checkout* ke nomor WA pengantre. |
| **TST-03** | **Keamanan Magic-Bytes & IDOR Bukti Bayar** | (a) Unggah file `.php` atau `.exe` yang diubah namanya menjadi `.jpg`. (b) Akses `GET /uploads/payments/[file]` menggunakan akun pelanggan lain. | (a) Ditolak dengan `400 Bad Request` karena gagal validasi *magic-bytes*. (b) Ditolak dengan `403 Forbidden` oleh pemeriksaan kepemilikan `getBookingByProofUrl`. |
| **TST-04** | **Transaksi Atomik Team Wallet & Loyalty** | Kirim 2 permintaan konfirmasi deposit secara paralel ke `POST /api/team-wallets/[id]/deposits/[depositId]/confirm` dan 2 klaim poin/voucher paralel. | Hanya 1 permintaan yang mengubah status menjadi `confirmed` dan menambah saldo/poin; permintaan kedua ditolak oleh kunci anti-ganda (*anti-double ledger*). |
| **TST-05** | **Isolasi Hak Akses 5-Role RBAC (`venue_staff`)** | Login menggunakan akun penjaga lapangan (`role: 'venue_staff'`), lalu coba akses `GET /api/owner/payouts`, `GET /api/owner/analytics`, dan `DELETE /api/owner/courts/[id]`. | Seluruh permintaan tersebut wajib ditolak dengan status `403 Forbidden`. Akses ke `/dashboard/kasir` dan `POST /api/owner/walk-in` harus berhasil (`200/201`). |
| **TST-06** | **Verifikasi Bebas Full-Scan SQL** | Jalankan `GET /api/owner/stats`, `GET /api/admin/bookings?page=1`, dan `GET /api/admin/commission` sambil memantau log kueri PostgreSQL. | Tidak ada kueri `SELECT * FROM bookings` tanpa klausa `WHERE venue_id` atau `LIMIT / OFFSET`; rute komisi hanya mengeksekusi 1 kueri agregasi `SUM/COUNT`. |
