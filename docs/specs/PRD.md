# PRD.md — Product Requirements Document

## 1. Identitas & Visi Produk
* **Nama Produk:** Lapabook (`https://lapabook.my.id`)
* **Tagline:** *"Booking lapangan olahraga jadi mudah, cepat, dan praktis. Pilih venue, pilih waktu, langsung main."*
* **Kategori:** Progressive Web App (PWA) *Mobile-First* untuk Pemesanan Fasilitas Olahraga (B2C), Manajemen Komunitas Olahraga (*Mabar & Team Wallet*), dan Sistem Operasional/Kasir Venue (B2B SaaS & POS).
* **Cakupan Saat Ini:** 6 cabang olahraga utama (Futsal, Mini Soccer, Badminton, Padel, Tennis, Basketball), menjangkau 7 kota dengan 3 venue aktif dan 16 lapangan (*courts*) yang beroperasi secara *live* di lingkungan produksi.

## 2. Pernyataan Masalah (Problem Statement)
1. **Friksi Pemesanan Pemain & Kapten Tim (Sisi B2C):**
   * Alur pemesanan berbasis direktori multi-halaman konvensional membuat kapten tim kesulitan membandingkan jam kosong (*prime-time* 18:00–22:00) antar-venue di satu kota secara cepat pada layar ponsel.
   * Kapten tim di Indonesia sering harus menalangi uang sewa lapangan terlebih dahulu dan mengalami kesulitan menagih uang patungan (*split bill*) kepada anggota timnya, atau terpaksa membatalkan jadwal ketika kekurangan 1–2 pemain pada H-1.
2. **Hambatan Adopsi Pemilik & Penjaga Lapangan (Sisi B2B):**
   * Pemilik lapangan (*Venue Owner*) enggan memberikan akses *dashboard* utama kepada penjaga lapangan/kasir karena di dalamnya terdapat laporan total omzet bulanan dan menu pencairan dana (*payout*) yang bersifat rahasia.
   * Penjaga lapangan membutuhkan antarmuka kasir yang mampu mengunci jadwal pelanggan *walk-in* (tamu datang langsung/telepon) dalam waktu kurang dari 3 detik agar tidak terjadi tabrakan jadwal (*double-booking*) dengan pesanan online.

## 3. Target Pengguna & Ekosistem 5 Peran (5-Role Ecosystem)

| Peran Pengguna | Deskripsi Singkat | Masalah Utama yang Diselesaikan |
| :--- | :--- | :--- |
| **1. User (Pemain / Kapten Tim)** | Individu atau koordinator tim olahraga yang mencari jadwal lapangan, mengelola kas tim, atau mencari lawan/teman bermain (*Mabar*). | Pemesanan cepat 2 ketukan (*2-Tap Fast Booking*), opsi DP 50%, patungan via tautan WhatsApp tanpa wajib instal aplikasi, dan konversi jadwal pribadi ke *Public Mabar*. |
| **2. Owner Lapangan (Mitra Venue)** | Pemilik modal atau manajer bisnis fasilitas olahraga yang mendaftarkan venue mereka ke Lapabook. | *Self-onboarding* 60 detik via tautan Google Maps, analitik pendapatan & okupansi *real-time*, harga dinamis & diskon hujan otomatis, serta pencairan dana (*payout*) transparan. |
| **3. Admin Lapangan (Kasir / Penjaga Venue)** | Staf operasional harian di meja kasir lapangan yang menerima tamu hadir, mengecek kode *booking*, dan melayani tamu *walk-in*. | Antarmuka *Field Keeper POS* berbasis kalender visual (*Tape Chart*), blokir jadwal *walk-in* 1 ketukan, dan tombol pelunasan sisa DP 50% (*settlement*) tanpa akses ke laporan omzet bulanan. |
| **4. Admin Lapabook (Tim Operasional & CS)** | Staf operasional internal Lapabook yang memverifikasi pembayaran manual, memoderasi venue/ulasan, dan menangani keluhan pelanggan. | Antrean verifikasi berprioritas untuk menjaga SLA konfirmasi <15 menit, mediasi *reschedule/refund* terintegrasi WhatsApp, dan kurasi mitra baru. |
| **5. Superadmin (Prinsipal Platform)** | Pemegang otoritas tertinggi sistem Lapabook yang mengelola parameter finansial, keamanan, dan konfigurasi global. | Persetujuan akhir pencairan dana mitra (*payout paid*), pengaturan komisi global di `platform_settings`, manajemen RBAC, dan pemantauan penuh `audit_logs`. |

## 4. Metrik Keberhasilan Utama (Key Performance Indicators)
* **SLA Konfirmasi Pembayaran:** < 15 menit untuk seluruh pembayaran manual yang mengunggah bukti transfer valid.
* **Kecepatan Transaksi Pemain:** Waktu rata-rata dari membuka aplikasi hingga mendapatkan kode *booking* di bawah 45 detik (maksimal 2–3 layar interaksi).
* **Kecepatan Input Walk-In Kasir:** Penjaga lapangan dapat memblokir jam kosong untuk tamu *offline* dalam waktu <= 3 detik.
* **Efisiensi Kueri Basis Data:** 0 pemindaian tabel penuh (*zero full-table scan*) pada rute analitik dan daftar pesanan, menurunkan konsumsi memori RAM Node.js hingga > 99% saat jumlah baris melampaui 10.000 reservasi.
