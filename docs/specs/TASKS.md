# TASKS.md — Sprint Execution Checklist & OpenClaw Automation Commands

## 1. Daftar Ceklis Tugas Rekayasa (Engineering Task Backlog)

### Pra-Sprint: Pembersihan & Persiapan Lingkungan OpenClaw
- [ ] Hapus 3 cabang lokal usang (*stale branches*) yang sudah digabungkan ke `main`: `feature/dp-payment`, `feature/p2-customer`, `fix/audit-bugs`.
- [ ] Jalankan diagnostik `openclaw doctor`, aktifkan `verboseDefault: "on"`, dan buat berkas kontrak `.openclaw-lapabook-rules.md` di akar proyek.

### Sprint 1 — Perf Full-Scan SQL & Stabilitas Memori (Prioritas P2)
- [ ] **Task 1.1:** Ganti `getBookings()` *full-scan* pada `src/app/api/owner/stats/route.ts` dan `src/app/api/owner/analytics/route.ts` (baris 64) dengan `getBookingsByVenueIds(venueIds)` yang sudah ada di `postgres-adapter.ts` baris 407.
- [ ] **Task 1.2:** Tambahkan `getBookingsPaged(filter, limit, offset)` pada `DatabaseAdapter` dan `postgres-adapter.ts` (`WHERE` + `LIMIT/OFFSET`), lalu pasang pada `src/app/api/admin/bookings/route.ts` (`?page=&status=`).
- [ ] **Task 1.3:** Ganti `Promise.all([getBookings(), getCourts(), ...])` pada `admin/commission` (baris 75) dan `admin/analytics/revenue` (baris 134) menjadi 1 kueri agregasi SQL (`SUM/COUNT GROUP BY`).
- [ ] **Task 1.4:** Tambahkan `getBookingByProofUrl(filename)` (`WHERE payment_proof_url LIKE`) di `postgres-adapter.ts` untuk menggantikan `getBookings()` *full-scan* pada pemeriksaan kepemilikan bukti bayar.

### Sprint 2 — Penyelesaian Celah Team Wallet & Split Bill (Prioritas P2)
- [ ] **Task 2.1:** Lengkapi alur konfirmasi deposit pada `deposits/[depositId]/confirm/route.ts` agar mengubah status `pending -> confirmed` secara atomik dan menulis ke tabel *ledger* transaksi.
- [ ] **Task 2.2:** Buat endpoint `GET /api/team-wallets/[id]/splits` dan tampilkan daftar riwayat *split bill* beserta tautan tagihan WhatsApp pada tab **Split** di `/profile/wallet/[id]`.
- [ ] **Task 2.3:** Tambahkan fitur pencarian pelanggan berdasarkan nomor telepon atau email saat menambahkan anggota baru ke dalam *Team Wallet*.

### Sprint 3 — Stabilitas Platform, Migrasi CMS/SEO & Cron H-1 (Prioritas P2)
- [ ] **Task 3.1:** Migrasikan penyimpanan `cms.ts` dan `seo-settings.json` ke tabel PostgreSQL `platform_settings` (gunakan isi file saat ini sebagai nilai *seed* awal).
- [ ] **Task 3.2:** Pasang `checkRateLimit` pada `auth/customer/login`, `auth/owner/login`, dan `auth/admin/login`.
- [ ] **Task 3.3:** Buat endpoint cron `GET /api/cron/reminder-h1` untuk mengirimkan pengingat jadwal bermain otomatis via WhatsApp dan email pada H-1.

### Sprint 4 — Standardisasi Sistem Desain & Pembersihan Emoji (Prioritas P2)
- [ ] **Task 4.1:** Konfigurasikan fon `Atkinson Hyperlegible` dan `JetBrains Mono` di `src/app/layout.tsx` serta alias warna `accent-*` di `tailwind.config.ts`.
- [ ] **Task 4.2:** Pindai dan ganti seluruh ~84 karakter emoji yang tersisa di `/dashboard`, `/admin`, dan `/profile` dengan komponen ikon `lucide-react`.

### Sprint 5 — Arsitektur 5-Role RBAC & Mode Kasir Penjaga Lapangan
- [ ] **Task 5.1:** Perluas klaim JWT `owner_auth_token` untuk mendukung `role: 'venue_staff'` dan `assignedVenueIds`, buat halaman manajemen staf di `/dashboard/staff`, dan blokir akses `venue_staff` ke rute *payout*/analitik omzet bulanan.
- [ ] **Task 5.2:** Bangun halaman Mode Kasir `/dashboard/kasir` dengan tampilan **Interactive Timeline Tape Chart**, fitur *1-Tap Walk-In Block* (`POST /api/owner/walk-in`), dan tombol *1-Tap Settlement*.
- [ ] **Task 5.3:** Pisahkan hak akses `ops_admin` dan `superadmin` pada `admin_auth_token` untuk mengunci persetujuan akhir *payout* dan pengaturan komisi global.

### Sprint 6 — Redesain Mobile-First PWA & Peluncuran Fitur Unggulan (Prioritas P3)
- [ ] **Task 6.1:** Bangun komponen `MobileBottomNav.tsx` (64px + *safe-area*), sematkan **Inline Time-Slot Ribbon** pada kartu pencarian venue, dan ubah alur `/checkout` menjadi *Bottom-Sheet Drawer*.
- [ ] **Task 6.2:** Aktifkan fitur **Convert Private Booking to Public Mabar** pada `/invoice/[id]` dan fitur **Smart Waitlist 15-Minute Auto-Snatch** pada slot yang sedang di-*hold*.

## 2. Skrip Eksekusi Otomatis OpenClaw CLI
Salin dan jalankan perintah berikut di terminal mesin pengembangan untuk mengeksekusi tugas-tugas di atas melalui agen **OpenClaw**:

```bash
# Persiapan Workspace & Kontrak Aturan OpenClaw
git checkout main && git pull origin main
git branch -d feature/dp-payment feature/p2-customer fix/audit-bugs
openclaw doctor
openclaw config set agents.defaults.verboseDefault "on"
openclaw gateway restart

# Eksekusi Sprint 1 (Eliminasi Full-Scan SQL)
openclaw agent exec --cwd . "Baca DATABASE.md, API.md, dan TASKS.md. Kerjakan seluruh Task 1.1 hingga Task 1.4 pada Sprint 1: ganti getBookings() dengan getBookingsByVenueIds di owner/stats & analytics, implementasikan getBookingsPaged di admin/bookings, ubah kalkulasi admin/commission & revenue menjadi 1 SQL aggregate SUM/COUNT GROUP BY, dan buat getBookingByProofUrl untuk proof lookup. Validasi dengan npx tsc --noEmit dan buat git commit."

# Eksekusi Sprint 2 (Team Wallet & Split Bill)
openclaw agent exec --cwd . "Baca BUSINESS_RULES.md, API.md, dan TASKS.md. Kerjakan Task 2.1 hingga Task 2.3 pada Sprint 2: lengkapi konfirmasi deposit pending->confirmed secara atomik beserta ledger, buat GET /api/team-wallets/[id]/splits dan sambungkan ke UI tab Split, serta tambahkan lookup nomor HP/email saat menambah member wallet. Validasi dengan npx tsc --noEmit dan buat git commit."

# Eksekusi Sprint 3 (Migrasi CMS/SEO ke DB, Rate-Limit Login & Cron H-1)
openclaw agent exec --cwd . "Baca ARCHITECTURE.md, SECURITY.md, dan TASKS.md. Kerjakan Task 3.1 hingga Task 3.3 pada Sprint 3: migrasikan cms.ts dan seo-settings.json ke tabel platform_settings PostgreSQL, pasang checkRateLimit pada 3 route login, dan buat GET /api/cron/reminder-h1 mengikuti pola expire-bookings. Validasi dengan npx tsc --noEmit dan buat git commit."

# Eksekusi Sprint 4 (Desain Tactical Sport-Tech & Pembersihan Emoji)
openclaw agent exec --cwd . "Baca DESIGN.md dan TASKS.md. Kerjakan Task 4.1 dan Task 4.2 pada Sprint 4: pasang font Atkinson Hyperlegible & JetBrains Mono, tambahkan token warna accent-* di tailwind.config.ts, dan ganti seluruh ~84 emoji di dashboard, admin, dan profile dengan ikon lucide-react. Validasi dengan npx tsc --noEmit dan buat git commit."

# Eksekusi Sprint 5 (Arsitektur 5-Role RBAC & Mode Kasir POS)
openclaw agent exec --cwd . "Baca PRD.md, SECURITY.md, USER_FLOW.md, dan TASKS.md. Kerjakan Task 5.1 hingga Task 5.3 pada Sprint 5: implementasikan role venue_staff & superadmin, halaman manajemen staf /dashboard/staff, halaman kasir /dashboard/kasir dengan Tape Chart & 1-Tap Walk-In Block, serta guard otorisasi API. Validasi dengan npx tsc --noEmit dan buat git commit."

# Eksekusi Sprint 6 (Mobile-First PWA & Killer Features)
openclaw agent exec --cwd . "Baca DESIGN.md, FEATURES.md, USER_FLOW.md, dan TASKS.md. Kerjakan Task 6.1 dan Task 6.2 pada Sprint 6: buat MobileBottomNav, Inline Time-Slot Ribbon pada kartu venue, Bottom-Sheet Checkout drawer, fitur Convert Private Booking to Public Mabar, dan Smart Waitlist. Validasi dengan npx tsc --noEmit && npm run build, lalu buat git commit."
```
