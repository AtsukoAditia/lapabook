# API.md — API Routes & Contract Specification

## 1. Konvensi Umum API Next.js 16 App Router
* **Lokasi Rute:** Seluruh lebih dari 100 endpoint berada di bawah `src/app/api/*` dan menggunakan validasi skema `zod` untuk setiap payload masuk.
* **Format Respons & Kode Status:** Respons dikembalikan dalam format JSON standar. Kesalahan validasi mengembalikan `400 Bad Request`, kegagalan autentikasi `401 Unauthorized`, pelanggaran hak akses peran/kepemilikan `403 Forbidden`, konflik jadwal lapangan `409 Conflict`, dan pelanggaran batas laju permintaan `429 Too Many Requests`.

## 2. Katalog Endpoint Inti Berdasarkan Domain

### A. Domain Publik, Eksplorasi & Checkout

| Method & Path | Autentikasi | Deskripsi & Kontrak Eksekusi |
| :--- | :--- | :--- |
| `GET /api/venues` & `GET /api/courts/[id]` | Publik | Mengambil daftar venue, detail lapangan, serta ketersediaan slot harian (sekaligus memicu *lazy cleanup* untuk slot `waiting_payment` yang sudah melewati 15 menit). |
| `POST /api/bookings` | Publik (Guest) / `customer_token` | Membuat reservasi baru (mendukung *multi-slot*, *recurring*, dan pilihan `full` vs `dp_50`). Melakukan pengecekan tumpang tindih SQL; mengembalikan `BookingCodeRef` yang aman tanpa mengekspos nomor HP/email di URL publik. |
| `POST /api/payments/create` | Publik / `customer_token` | Membuat transaksi pembayaran melalui **Midtrans Snap** atau menginisialisasi instruksi 6 metode pembayaran manual. |
| `POST /api/payments/webhook` | Midtrans Signature | Menerima notifikasi *callback* dari Midtrans dan memperbarui status pesanan menjadi `paid` atau `dp_paid` secara otomatis. |
| `GET /uploads/payments/[filename]` | `customer_token` / `owner_auth_token` / `admin_auth_token` | Mengalirkan (*stream*) berkas bukti transfer dari direktori `./uploads` di luar `public/` setelah memvalidasi kepemilikan melalui `getBookingByProofUrl(filename)`. |

### B. Domain Pelanggan, Mabar & Team Wallet

| Method & Path | Autentikasi | Deskripsi & Kontrak Eksekusi |
| :--- | :--- | :--- |
| `POST /api/auth/customer/login` | Publik (+ `checkRateLimit`) | Autentikasi pelanggan menggunakan `bcryptjs`, mengeluarkan cookie HTTP-only `customer_token` (JWT `maxAge: 24h`). |
| `POST /api/bookings/[id]/reschedule` | `customer_token` (Owner Check) | Mengajukan perubahan jadwal bermain (dibatasi maksimal 1x dan minimal H-3 sebelum jadwal asli). |
| `POST /api/bookings/[id]/settlement` | `customer_token` / `owner_auth_token` | Melunasi sisa 50% pembayaran pada pesanan berstatus `dp_paid` sehingga berubah menjadi `paid`. |
| `POST /api/mabar/from-booking` | `customer_token` (Owner Check) | Mengonversi jadwal *private booking* yang sudah diamankan menjadi sesi *Public Mabar* di direktori `/mabar`. |
| `POST /api/team-wallets/[id]/deposits/[depositId]/confirm` | `customer_token` (Wallet Admin) | Mengonfirmasi deposit kas tim secara transaksional (`pending -> confirmed`), menambah saldo dompet, dan menulis catatan ke *ledger*. |
| `GET /api/team-wallets/[id]/splits` | `customer_token` (Membership Check) | Mengambil daftar tagihan patungan (*split bills*) aktif maupun selesai beserta status pembayaran tiap anggota tim. |
| `POST /api/team-wallets/[id]/members` | `customer_token` (Membership Check) | Menambahkan anggota baru ke dalam *Team Wallet* melalui pencarian nomor telepon atau alamat email pelanggan. |

### C. Domain Owner Lapangan & Kasir Penjaga Venue (`venue_staff`)

| Method & Path | Autentikasi & RBAC | Deskripsi & Kontrak Eksekusi |
| :--- | :--- | :--- |
| `POST /api/auth/owner/login` | Publik (+ `checkRateLimit`) | Mengeluarkan `owner_auth_token` dengan klaim `role: 'owner' | 'venue_staff'` dan daftar `assignedVenueIds`. |
| `GET /api/owner/stats` & `GET /api/owner/analytics` | `role === 'owner'` (Blokir `venue_staff`) | Mengambil ringkasan pendapatan dan grafik okupansi menggunakan kueri terindeks `getBookingsByVenueIds(venueIds)`. |
| `POST /api/owner/payouts` | `role === 'owner'` (Blokir `venue_staff`) | Mengajukan pencairan saldo bersih venue ke rekening bank pemilik. |
| `POST /api/owner/staff` | `role === 'owner'` | Membuat, memperbarui, atau menonaktifkan akun penjaga lapangan (`venue_staff`) untuk venue milik Owner. |
| `POST /api/owner/walk-in` | `owner` atau `venue_staff` | Endpoint cepat Mode Kasir (`/dashboard/kasir`) untuk mengunci slot jam bagi tamu *walk-in* dalam 1 langkah. |

### D. Domain Admin Lapabook, Superadmin & Cron Sistem

| Method & Path | Autentikasi & RBAC | Deskripsi & Kontrak Eksekusi |
| :--- | :--- | :--- |
| `GET /api/admin/bookings` | `ops_admin` / `superadmin` | Mengambil daftar seluruh pesanan menggunakan paginasi sisi server `getBookingsPaged(filter, limit, offset)` (`?page=&limit=&status=`). |
| `GET /api/admin/commission` & `/api/admin/analytics/revenue` | `ops_admin` / `superadmin` | Menghitung total komisi platform dan pendapatan menggunakan kueri agregasi SQL tunggal (`SUM/COUNT GROUP BY`). |
| `POST /api/admin/payouts/[id]/paid` | Khusus `superadmin` | Menandai pencairan dana mitra telah ditransfer (`paid`) dan mencatat aksi ke `audit_logs`. |
| `GET` & `PUT /api/admin/settings` | Khusus `superadmin` | Membaca dan memperbarui pengaturan global, konten CMS, serta konfigurasi SEO di tabel PostgreSQL `platform_settings`. |
| `GET /api/cron/expire-bookings` | Cron Secret Token | Membersihkan seluruh pesanan `waiting_payment` yang telah melewati batas tahanan 15 menit dan memicu notifikasi *Smart Waitlist*. |
| `GET /api/cron/reminder-h1` | Cron Secret Token | Mengirimkan pengingat jadwal bermain otomatis pada H-1 melalui WhatsApp dan email secara *non-blocking* (`try/catch`). |
