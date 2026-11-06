# DECISIONS.md — Architecture Decision Records (ADR)

### ADR-001: Penggunaan Pola `DatabaseAdapter` Factory dengan PostgreSQL 16 sebagai Primary
* **Konteks:** Aplikasi membutuhkan fleksibilitas pengujian cepat di lingkungan lokal/CI namun menuntut keandalan transaksional penuh (ACID) dan penguncian baris di lingkungan produksi.
* **Keputusan:** Mengabstraksi seluruh operasi basis data di balik antarmuka `DatabaseAdapter` (`mock | google_sheets | postgres`) dengan PostgreSQL 16 (`pg 8.22`) sebagai mesin produksi utama.
* **Konsekuensi:** Seluruh pengembang dan agen AI wajib menambahkan method baru pada *adapter* dan dilarang menulis SQL langsung di *route handler*.

### ADR-002: Penyimpanan Bukti Bayar di Luar `public/` dengan Validasi Magic-Bytes
* **Konteks:** Menyimpan unggahan pengguna di dalam folder `public/` pada Next.js menimbulkan risiko eksepsi file berbahaya, kebocoran privasi bukti transfer, dan masalah kehilangan file saat *rebuild* image Docker.
* **Keputusan:** Menyimpan seluruh bukti pembayaran di `./uploads/payments/` yang dipetakan ke Docker volume persisten `uploads_data`, memvalidasi *magic-bytes* saat unggah, dan menyajikannya hanya melalui rute terautentikasi `GET /uploads/payments/[filename]`.
* **Konsekuensi:** Keamanan data finansial pengguna terjaga ketat di antara ketiga peran (Customer, Owner/Staff, Admin) dan tahan terhadap proses *rebuild* kontainer.

### ADR-003: Mekanisme Dual-Expiry untuk Tahanan Slot 15 Menit
* **Konteks:** Jika sistem hanya mengandalkan cron job periodik untuk melepas slot `waiting_payment` yang kedaluwarsa, jeda antar-eksekusi cron dapat membuat slot tampak masih terkunci selama beberapa menit ekstra.
* **Keputusan:** Menggabungkan **Lazy Cleanup** (pembersihan otomatis saat fungsi pembacaan ketersediaan slot dipanggil) dengan **Scheduled Cron** (`GET /api/cron/expire-bookings`) yang didukung indeks `bookings_expires_idx`.
* **Konsekuensi:** Akurasi ketersediaan slot selalu *real-time* hingga ke satuan detik tanpa membebani CPU basis data.

### ADR-004: Pemisahan Peran `Owner` dan `Admin Lapangan (venue_staff)`
* **Konteks:** Pemilik lapangan olahraga di Indonesia enggan menyerahkan akun *dashboard* utama kepada penjaga lapangan karena menampilkan total omzet bulanan dan akses pencairan dana (*payout*), namun penjaga lapangan wajib menginput tamu *walk-in* dan memverifikasi kedatangan pemain setiap jam.
* **Keputusan:** Memecah otorisasi mitra venue menjadi dua peran berbeda di dalam JWT `owner_auth_token` (`owner` vs `venue_staff`) dan menyediakan antarmuka khusus kasir (`/dashboard/kasir`) yang menyembunyikan seluruh metrik finansial sensitif.
* **Konsekuensi:** Hambatan adopsi mitra B2B hilang; penjaga lapangan dapat bekerja cepat menggunakan ponsel mereka tanpa risiko kebocoran rahasia dapur pemilik venue.

### ADR-005: Migrasi Konfigurasi CMS dan SEO dari File JSON ke Tabel `platform_settings`
* **Konteks:** Perubahan konten CMS (`cms.ts`) dan pengaturan SEO (`seo-settings.json`) yang disimpan pada sistem berkas di dalam kontainer bersifat volatil dan akan tertimpa ulang setiap kali kontainer dibangun ulang melalui `systemd-run`.
* **Keputusan:** Memigrasikan pembacaan dan penyimpanan konfigurasi CMS serta SEO ke dalam tabel PostgreSQL `platform_settings` yang sudah ada di volume persisten `postgres_data`.
* **Konsekuensi:** Seluruh perubahan pengaturan yang dilakukan oleh Admin/Superadmin melalui dashboard bersifat permanen lintas *deployment*.
