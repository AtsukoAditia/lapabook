# ROADMAP.md — Product & Engineering Evolution Plan

## 1. Fase 0 — Fondasi Produksi & Kelengkapan Transaksi Inti (Status: Selesai & Live)
* Arsitektur Next.js 16 App Router + PostgreSQL 16 (`DatabaseAdapter`), 100+ rute API, 60+ halaman, Docker Compose `lapabook-app` dengan volume eksternal `postgres_data` dan `uploads_data`.
* Alur pemesanan tamu (*guest*) & member, opsi pembayaran penuh & DP 50% (`20a5b7c`), *reschedule* 1x H-3 (`34d52a6`), notifikasi *refund* WA (`8f90819`), pelunasan *settlement* (`80c2ca7`), dan kebijakan kontainer `restart: unless-stopped` (`c5a4489`).

## 2. Fase 1 — Stabilitas Performa P2 & Penyempurnaan Team Wallet (Sprint 1 – Sprint 3)
* **Sprint 1 (Eliminasi Full-Scan SQL):** Penggantian `getBookings()` dengan `getBookingsByVenueIds` pada rute Owner, implementasi `getBookingsPaged` pada rute Admin, agregasi SQL tunggal pada rute komisi/pendapatan, dan indeks `getBookingByProofUrl` pada rute bukti bayar.
* **Sprint 2 (Kelengkapan Team Wallet):** Penyelesaian alur transaksional konfirmasi deposit (`pending -> confirmed`), pembuatan endpoint `GET /api/team-wallets/[id]/splits`, dan penambahan anggota dompet tim via pencarian nomor HP/email.
* **Sprint 3 (Ketahanan Platform & Otomatisasi):** Migrasi konfigurasi CMS (`cms.ts`) dan SEO (`seo-settings.json`) dari berkas lokal ke tabel `platform_settings` PostgreSQL, pemasangan `checkRateLimit` pada ketiga rute login, serta pembuatan cron pengingat otomatis `GET /api/cron/reminder-h1`.

## 3. Fase 2 — Sistem Desain "Tactical Sport-Tech" & Arsitektur 5-Role RBAC (Sprint 4 – Sprint 5)
* **Sprint 4 (Standardisasi UI & Zero-Emoji):** Integrasi fon *Atkinson Hyperlegible* dan *JetBrains Mono*, penambahan token warna `accent-*` di Tailwind, serta penggantian seluruh ~84 karakter emoji yang tersisa di `/dashboard`, `/admin`, dan `/profile` dengan ikon `lucide-react`.
* **Sprint 5 (5-Role RBAC & Mode Kasir POS):** Pemisahan peran `owner` vs `venue_staff` (Admin Lapangan) dan `ops_admin` vs `superadmin`. Peluncuran antarmuka kasir `/dashboard/kasir` berbasis **Interactive Timeline Tape Chart** dengan fitur *1-Tap Walk-In Block* (3 detik) dan *1-Tap Settlement*.

## 4. Fase 3 — Transformasi Mobile-First PWA & Peluncuran Killer Features (Sprint 6)
* Implementasi `MobileBottomNav` (64px dengan *safe-area inset*), penyematan **Inline Time-Slot Ribbon** langsung pada kartu pencarian venue, dan penyederhanaan *checkout* menjadi laci geser (*Bottom-Sheet Drawer*).
* Peluncuran fitur **Convert Private Booking to Public Mabar** lintas 6 cabang olahraga, **Smart Waitlist 15-Minute Auto-Snatch**, **1-Tap Add-Ons**, dan rute **White-Label Bio-Link (`/v/[slug]`)**.

## 5. Fase 4 — Ekspansi Ekosistem Olahraga Nasional (Backlog P3 Lanjutan)
* Integrasi rekaman kamera lapangan otomatis (*Live Cam 30-minute capture*), *Tournament Builder*, paket keanggotaan berlangganan (*Subscription/Membership*), iklan venue (*Promoted Venues*), pencarian geolokasi terdekat (*Near-Me Geo*), serta sinkronisasi draf pesanan lintas perangkat (*Cross-Device Booking Drafts*).
