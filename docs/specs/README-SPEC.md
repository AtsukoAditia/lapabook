# Lapabook — Platform Booking Lapangan Olahraga, Komunitas Mabar & POS Venue (`lapabook.my.id`)

**Lapabook** adalah ekosistem aplikasi web progresif (*Mobile-First Progressive Web App*) untuk pemesanan fasilitas olahraga di Indonesia yang mendukung 6 cabang olahraga utama (**Futsal, Mini Soccer, Badminton, Padel, Tennis, dan Basketball**) serta dirancang dengan arsitektur **5 Peran Pengguna (5-Role RBAC)** agar sangat mudah digunakan oleh pemain sekaligus aman bagi pemilik lapangan untuk didelegasikan kepada staf kasir mereka.

### Keunggulan Utama Arsitektur Lapabook
1. **2-Tap Fast Booking & Dual Payment:** Pemesanan cepat dari pita jadwal *inline* ke laci *Bottom-Sheet Checkout*, mendukung pengguna tamu (*guest checkout* tanpa akun), pembayaran **Lunas (100%)** atau **DP 50%**, integrasi otomatis **Midtrans Snap**, serta 6 metode transfer manual dengan validasi bukti bayar berproteksi *magic-bytes*.
2. **Fitur Komunitas & Finansial Tim Terlengkap:** Dilengkapi fitur **Mabar** (termasuk konversi jadwal *Private Booking* menjadi *Public Mabar* saat kekurangan pemain), **Team Wallet** berlapis buku besar transaksional, **Auto Split-Bill** via tautan WhatsApp, serta program **Loyalty Points** hingga pengali `3x`.
3. **Mesin Harga Dinamis & Garansi Cuaca (`rain-factor`):** Penyesuaian tarif otomatis berdasarkan jam sibuk (`1.25x`), akhir pekan (`1.15x`), jam sepi (`0.90x`), dan diskon cuaca hujan otomatis bagi venue *outdoor*.
4. **Arsitektur 5-Role RBAC & Mode Kasir POS:** Memisahkan akses antara **Pemain**, **Owner Lapangan** (fokus analitik omzet & *payout*), **Admin Lapangan / Kasir** (fokus *Tape Chart* harian, blokir tamu *walk-in* 3 detik, dan pelunasan DP 50%), **Admin Operasional Lapabook**, dan **Superadmin**.
5. **Fondasi Rekayasa Production-Grade:** Dibangun di atas **Next.js 16 App Router**, **TypeScript Strict**, **Tailwind CSS 3**, **PostgreSQL 16** (`DatabaseAdapter` Factory), serta berjalan di atas kontainer Docker (`lapabook-app`) dengan penyimpanan eksternal persisten (`postgres_data` dan `uploads_data`).

### Panduan Menjalankan Proyek Secara Lokal & Produksi
```bash
# 1. Instalasi dependensi
npm install

# 2. Pemeriksaan tipe statis TypeScript (Wajib 0 error)
npx tsc --noEmit

# 3. Menjalankan server pengembangan lokal
npm run dev

# 4. Membangun aplikasi untuk produksi
npm run build
```

### Peta Indeks Dokumentasi Proyek (`docs/`)
Seluruh spesifikasi produk, desain, aturan bisnis, dan arsitektur teknis Lapabook terdokumentasi secara modular di dalam 14 berkas referensi berikut:
* **`PRD.md`** — Visi produk, masalah pasar B2C/B2B, ekosistem 5 peran, dan target KPI utama.
* **`DESIGN.md`** — Spesifikasi sistem desain *Tactical Sport-Tech Minimalist*, palet warna semantik, tipografi, dan tata letak *Mobile-First PWA*.
* **`USER_FLOW.md`** — Alur interaksi ujung-ke-ujung (*end-to-end*) untuk kelima peran pengguna.
* **`REQUIREMENTS.md`** — Daftar kebutuhan fungsional (`FR`) dan non-fungsional (`NFR`).
* **`FEATURES.md`** — Inventaris fitur aktif, 6 fitur unggulan pembeda (*Killer Features*), dan antrean fitur P3.
* **`BUSINESS_RULES.md`** — Mesin status pemesanan, aturan tahanan 15 menit, DP 50%, pengali harga dinamis, *reschedule* H-3, dan rumus *loyalty/payout*.
* **`DATABASE.md`** — Pola `DatabaseAdapter`, skema tabel PostgreSQL 16, indeks kritis, dan aturan anti *full-scan*.
* **`API.md`** — Kontrak dan spesifikasi rute API (`src/app/api/*`) beserta persyaratan otorisasi dan cron.
* **`ARCHITECTURE.md`** — Tumpukan teknologi, kontainer Docker Compose, volume persisten, prosedur `systemd-run`, dan layanan notifikasi *non-blocking*.
* **`SECURITY.md`** — Manajemen JWT 3 token, jalur rahasia admin 24-hex, matriks 5-Role RBAC, proteksi IDOR berlapis, dan keamanan unggahan file.
* **`TESTING.md`** — Gerbang kualitas kompilasi, variabel `IS_TESTING_ENV`, dan skenario pengujian kritis.
* **`ROADMAP.md`** — Tahapan evolusi produk dan rekayasa dari Fase 0 hingga Fase 4.
* **`DECISIONS.md`** — Catatan Keputusan Arsitektur (*Architecture Decision Records* / ADR-001 s/d ADR-005).
* **`TASKS.md`** — Daftar ceklis eksekusi *Sprint 1 – Sprint 6* beserta perintah otomatisasi **OpenClaw CLI** (`openclaw agent exec`).
