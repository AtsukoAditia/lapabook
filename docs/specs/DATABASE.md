# DATABASE.md — Database Architecture, Schema & Query Standards

## 1. Arsitektur Abstraksi Basis Data (`DatabaseAdapter` Factory)
Lapabook menggunakan pola **Adapter Factory** yang memungkinkan logika bisnis aplikasi berjalan secara identik di atas tiga penyedia penyimpanan yang dikendalikan melalui variabel lingkungan `DATABASE_PROVIDER`:
1. `postgres` (**Primary Production**): Menggunakan **PostgreSQL 16** melalui pustaka `pg` (versi 8.22) dengan penyimpanan persisten pada Docker external volume `postgres_data`.
2. `google_sheets`: Adapter cadangan untuk integrasi spreadsheet ringan.
3. `mock`: Adapter berbasis memori untuk pengujian unit dan pengembangan terisolasi.

**Aturan Emas Rekayasa Basis Data:** Seluruh operasi baca/tulis wajib didefinisikan kontraknya di dalam antarmuka `DatabaseAdapter` dan diimplementasikan di dalam `postgres-adapter.ts`. Dilarang keras menulis kueri SQL mentah secara langsung di dalam berkas *route handler* (`src/app/api/*`).

## 2. Skema Tabel Utama & Indeks Kritis (PostgreSQL 16)

| Nama Tabel | Fungsi Utama & Kolom Kritis | Indeks & Kendala Integritas (Constraints) |
| :--- | :--- | :--- |
| `venues` | Menyimpan profil fasilitas olahraga (`id`, `owner_id`, `name`, `slug`, `city`, `address`, `maps_url`, `sports`, `rain_discount_config`, `is_verified`). | Indeks pada `owner_id`, `city`, dan `slug` unik untuk SEO canonical. |
| `courts` | Menyimpan unit lapangan di dalam suatu venue (`id`, `venue_id`, `name`, `sport_type`, `base_price`, `pricing_rules`, `photos`). | Foreign key ke `venues(id)`, indeks pada `(venue_id, sport_type)`. |
| `bookings` | Menyimpan seluruh transaksi reservasi (`id`, `code`, `venue_id`, `court_id`, `customer_id`, `booking_date`, `start_time`, `end_time`, `status`, `payment_type`, `total_amount`, `dp_amount`, `payment_proof_url`, `expires_at`, `reschedule_count`). | Indeks `bookings_expires_idx` pada `(status, expires_at)` untuk pembersihan 15 menit; indeks komposit `(court_id, booking_date, start_time)` untuk cek anti *double-booking*; indeks pada `venue_id` dan `payment_proof_url`. |
| `customers` | Menyimpan akun pemain (`id`, `name`, `phone`, `email`, `password_hash`, `loyalty_points`, `loyalty_tier`, `referral_code`, `is_banned`). | Indeks unik pada `email` dan `phone` (mendukung *lookup* anggota *Team Wallet* & *merge-by-phone*). |
| `owners` & `venue_staff` | Menyimpan kredensial pemilik venue (`owners`) serta staf kasir penjaga lapangan (`venue_staff` yang terikat pada `assigned_venue_ids`). | Indeks unik pada email/telepon; pembatasan *scope* akses hanya pada `venue_id` yang ditugaskan. |
| `team_wallets` & `team_wallet_*` | Mencakup 4 tabel relasional: `team_wallets`, `team_wallet_members`, `team_wallet_deposits`, `team_wallet_transactions` (ledger), dan `team_wallet_splits`. | Transaksi `BEGIN...COMMIT` wajib pada saat mengubah status deposit `pending -> confirmed` dan menambah saldo. |
| `mabar_sessions` | Menyimpan jadwal pertandingan terbuka (`/mabar`), kuota pemain, biaya patungan per kursi, dan referensi ke `booking_id` jika berasal dari konversi *private booking*. | Indeks pada `(city, sport_type, match_date, status)`. |
| `platform_settings` | Tabel *key-value* JSONB persisten untuk menyimpan konfigurasi platform global, parameter komisi, konten CMS (`cms_content`), dan pengaturan SEO (`seo_settings`). | Primary key pada `setting_key`. Menggantikan berkas JSON lokal yang volatil saat *rebuild* Docker. |
| `audit_logs` | Menyimpan rekam jejak forensik setiap mutasi sensitif (`id`, `actor_id`, `actor_role`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at`). | *Append-only* (tidak boleh ada fungsi `DELETE` atau `UPDATE` pada tabel ini). |

## 3. Standar Optimasi Kueri & Larangan Full-Scan (Mandat Sprint 1)
Untuk menjaga penggunaan memori Node.js tetap rendah pada skala puluhan ribu pesanan, empat pola kueri berikut wajib diterapkan di `postgres-adapter.ts`:
1. **Scoped Venue Query (`getBookingsByVenueIds`):** Rute `owner/stats` dan `owner/analytics` wajib memanggil `getBookingsByVenueIds(venueIds)` (baris 407 pada `postgres-adapter.ts`) dan dilarang memanggil `getBookings()`.
2. **Server-Side Pagination (`getBookingsPaged`):** Rute `admin/bookings` wajib menggunakan `getBookingsPaged(filter, limit, offset)` dengan klausa SQL `WHERE ... ORDER BY created_at DESC LIMIT $n OFFSET $m`.
3. **Database-Level Aggregation:** Rute `admin/commission` dan `admin/analytics/revenue` wajib menggunakan kueri agregasi SQL tunggal (`SELECT SUM(total_amount), COUNT(id) ... GROUP BY ...`) alih-alih menarik seluruh tabel ke memori melalui `Promise.all([getBookings(), getCourts()])`.
4. **Indexed Proof Lookup (`getBookingByProofUrl`):** Rute verifikasi kepemilikan bukti bayar `/uploads/payments/[filename]` wajib menggunakan `getBookingByProofUrl(filename)` dengan klausa `WHERE payment_proof_url LIKE $1 LIMIT 1`.
