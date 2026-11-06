# SECURITY.md — Security, Authentication & 5-Role RBAC Policy

## 1. Arsitektur Autentikasi & Manajemen Sesi (JWT + Cookie Sync)
Lapabook memisahkan sesi autentikasi ke dalam tiga ruang token JWT (`jose`) yang disimpan di dalam HTTP-Only Cookie dengan masa berlaku (`maxAge: 24h`) yang disinkronkan secara presisi dengan klaim kedaluwarsa (`exp`) di dalam token:
1. `customer_token`: Digunakan oleh pemain terautentikasi pada rute `/profile/*` dan API transaksi pelanggan.
2. `owner_auth_token`: Digunakan oleh pemilik lapangan (`role: 'owner'`) dan penjaga lapangan (`role: 'venue_staff'`) pada rute `/dashboard/*`. Token ini menyimpan klaim `assignedVenueIds` untuk membatasi kueri hanya pada venue yang sah.
3. `admin_auth_token`: Digunakan oleh staf internal Lapabook (`adminRole: 'ops_admin'`) dan prinsipal sistem (`adminRole: 'superadmin'`).

## 2. Isolasi Portal Admin (24-Char Hex Secret Path & Fail-Closed)
* Rute standar `/admin` diblokir secara langsung (*direct block*) dan selalu mengembalikan halaman tidak ditemukan/ditolak.
* Portal manajemen internal hanya dapat diakses melalui jalur rahasia sepanjang **24 karakter heksadesimal** yang dikonfigurasi melalui variabel lingkungan.
* Di lingkungan produksi (`NODE_ENV === 'production'`), sistem menerapkan prinsip **Fail-Closed**: apabila variabel lingkungan jalur rahasia atau kunci rahasia JWT admin belum dikonfigurasi dengan benar, seluruh rute admin akan menolak akses secara otomatis.

## 3. Proteksi IDOR Berlapis (Tiered IDOR Protection)
Untuk mencegah celah *Insecure Direct Object Reference* (IDOR), setiap akses ke objek transaksi wajib melewati verifikasi kepemilikan berlapis:
* **Keamanan Kode Publik (`BookingCodeRef`):** Halaman publik `/checkout/success?code=` dan pencarian kode pesanan hanya menampilkan referensi pemesanan yang aman dan **menyembunyikan** informasi sensitif seperti nomor telepon lengkap dan alamat email pemesan.
* **Isolasi Team Wallet (`Membership-Only`):** Seluruh rute pembacaan dan mutasi pada `/api/team-wallets/[id]/*` memeriksa secara ketat apakah `customer_id` pemanggil terdaftar sebagai anggota aktif di dalam dompet tim tersebut.
* **Isolasi Owner & Venue Staff:** Setiap mutasi lapangan, jadwal, maupun konfirmasi pembayaran pada `/api/owner/*` memverifikasi bahwa `venue_id` dari objek yang diakses benar-benar dimiliki oleh `owner_id` atau termasuk di dalam `assignedVenueIds` milik `venue_staff`.

## 4. Keamanan Unggahan Bukti Pembayaran
1. **Penyimpanan di Luar Direktori Publik:** File bukti transfer tidak pernah disimpan di dalam `public/`, melainkan di direktori terisolasi `./uploads/payments/` (volume `uploads_data`).
2. **Validasi Magic-Bytes & Ukuran:** Server memeriksa *magic-bytes* (tanda tangan biner awal file) untuk memastikan file yang diunggah benar-benar gambar yang valid (JPEG/PNG/WebP), bukan skrip berbahaya yang diubah namanya, dengan batas ukuran maksimal **5MB**.
3. **Anti Path Traversal & Signed Access:** Nama file dibersihkan dari karakter navigasi direktori (`../`), dan file hanya dapat dilihat melalui endpoint `GET /uploads/payments/[filename]` yang memvalidasi token autentikasi (3 peran) serta mencocokkan kepemilikan pesanan melalui fungsi terindeks `getBookingByProofUrl(filename)`.

## 5. Pembatasan Laju (Rate Limiting) & Audit Forensik
* **Rate Limiting Aktif:** Pustaka `rate-limiter-flexible` melindungi seluruh endpoint pembuatan pesanan, unggah bukti, dan wajib dipasang pada ketiga endpoint autentikasi (`/api/auth/customer/login`, `/api/auth/owner/login`, `/api/auth/admin/login`) dengan batas maksimal 5 percobaan gagal per 15 menit per IP untuk menghentikan serangan *brute-force*. Pembatas ini hanya dilewati (*bypass*) apabila variabel `IS_TESTING_ENV` bernilai `true`.
* **Rekam Jejak Audit (`audit_logs`):** Setiap tindakan krusial—meliputi perubahan status pesanan manual, persetujuan venue, moderasi pembayaran/refund, penangguhan akun pemilik, hingga pencairan *payout*—dicatat secara permanen ke dalam tabel `audit_logs`.
