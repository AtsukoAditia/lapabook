# REQUIREMENTS.md — Functional & Non-Functional Requirements

## 1. Kebutuhan Fungsional (Functional Requirements)

| Kode | Modul | Spesifikasi Kebutuhan Fungsional | Status |
| :--- | :--- | :--- | :--- |
| **FR-PUB-01** | Discovery & Pencarian | Sistem harus menyediakan pencarian venue berdasarkan cabang olahraga (6 olahraga), kota (7 kota), dan ketersediaan jadwal *real-time*. | Live (Dioptimasi di Sprint 6) |
| **FR-PUB-02** | Checkout & Guest | Sistem harus mengizinkan pemesanan tamu tanpa pembuatan akun (*guest checkout*) cukup dengan nama, nomor telepon, dan email. | Live |
| **FR-PUB-03** | Skema Pembayaran | Sistem harus mendukung opsi pembayaran **Full (100%)** maupun **DP 50%** melalui Midtrans Snap (online otomatis) dan 6 metode transfer manual dengan unggah bukti bayar. | Live |
| **FR-CUS-01** | Reschedule & Settlement | Pelanggan terautentikasi dapat mengajukan *reschedule* maksimal 1 kali paling lambat H-3 sebelum jadwal, mengajukan *refund*, dan melakukan pelunasan (*settlement*) atas pesanan DP 50%. | Live |
| **FR-CUS-02** | Loyalty & Gamifikasi | Sistem memberikan 10 poin per Rp10.000 transaksi `confirmed` dengan pengali tier (Bronze, Silver, Gold, Platinum/Diamond), kode referral (50rb/25rb), dan 18 lencana pencapaian. | Live |
| **FR-SOC-01** | Mabar & Matchmaking | Pengguna dapat membuat sesi Mabar (`/mabar/buat`), bergabung/keluar sesi, menggunakan *pickup-games* API, mencari lawan tanding (*match-requests*), dan memberi rating pemain. | Live |
| **FR-SOC-02** | Konversi ke Public Mabar | Pemilik reservasi pribadi berstatus `confirmed`/`paid`/`dp_paid` dapat mengonversi slotnya menjadi sesi *Public Mabar* lintas 6 cabang olahraga untuk mencari tambahan pemain. | Target Sprint 6 |
| **FR-WAL-01** | Team Wallet & Split Bill | Sistem menyediakan dompet tim dengan 4 tab (*Members, Deposits, Transactions, Split*), konfirmasi deposit atomik, daftar riwayat *split*, dan penambahan anggota via nomor HP/email. | Live + Penyempurnaan Sprint 2 |
| **FR-OWN-01** | Manajemen Venue & Harga | Owner dapat mendaftarkan venue via *3-step wizard* (`mapsUrl` auto-create court), mengelola CRUD lapangan, foto, aturan harga dinamis, dan konfigurasi diskon cuaca hujan. | Live |
| **FR-POS-01** | Mode Kasir Penjaga Venue | Sistem wajib menyediakan peran khusus `venue_staff` dengan antarmuka kalender kasir (`/dashboard/kasir`) untuk blokir *walk-in* instan dan pelunasan DP tanpa akses ke menu *payout* atau omzet bulanan. | Target Sprint 5 |
| **FR-ADM-01** | Operasional & Superadmin | Portal admin pada rute rahasia 24-hex menyediakan manajemen *booking* terpaginasi, persetujuan *refund/payout*, moderasi ulasan, CMS/SEO berbasis DB, ekspor CSV, dan pencatatan `audit_logs`. | Live + Optimasi Sprint 1 & 3 |

## 2. Kebutuhan Non-Fungsional (Non-Functional Requirements)
* **NFR-PERF-01 (Larangan Full-Scan SQL):** Tidak boleh ada satupun endpoint API yang memanggil `getBookings()` tanpa filter untuk diproses di memori Node.js. Seluruh pembacaan daftar pesanan wajib menggunakan indeks basis data (`WHERE venue_id = ANY($1)` atau `LIMIT / OFFSET`), dan perhitungan analitik wajib menggunakan fungsi agregasi SQL (`SUM`, `COUNT`, `GROUP BY`).
* **NFR-SEC-01 (Isolasi Penyimpanan & Validasi Bukti Bayar):** Berkas unggahan bukti pembayaran wajib disimpan di luar direktori publik (`./uploads`), divalidasi menggunakan *magic-bytes* dengan ukuran maksimal 5MB, bebas dari celah *path traversal*, dan hanya dapat diakses melalui rute terautentikasi yang memverifikasi kepemilikan di semua lapisan.
* **NFR-REL-01 (Ketahanan Kontainer & Data Persisten):** Seluruh data transaksi PostgreSQL dan berkas unggahan wajib berada pada volume Docker eksternal (`postgres_data` dan `uploads_data`). Konfigurasi CMS dan SEO wajib disimpan di tabel `platform_settings` agar tidak hilang saat kontainer di-*rebuild* melalui `systemd-run`.
* **NFR-QUAL-01 (Kualitas Kode & Aksesibilitas):** Kode sumber wajib lulus pemeriksaan `TypeScript strict` (`npx tsc --noEmit` menghasilkan 0 error), mendukung instalasi PWA *standalone* dengan halaman `/offline`, memiliki target sentuh minimal `44px`, dan bersih dari karakter emoji.
