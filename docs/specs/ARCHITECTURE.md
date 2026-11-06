# ARCHITECTURE.md — System Architecture & Infrastructure

## 1. Tumpukan Teknologi (Technology Stack)
* **Framework Aplikasi:** Next.js 16 (App Router) dengan dukungan penuh *Server Components*, *Route Handlers*, dan *Progressive Web App* (PWA) *standalone*.
* **Bahasa & Validasi Tipe:** TypeScript dalam mode ketat (*strict mode*) dipadukan dengan `zod` untuk validasi skema runtime.
* **Antarmuka & Styling:** Tailwind CSS 3, komponen ikon vektor `lucide-react`, serta grafik analitik berbasis SVG murni tanpa ketergantungan pustaka grafik pihak ketiga yang berat di sisi klien.
* **Basis Data & Penyimpanan:** PostgreSQL 16 (`pg 8.22`) di balik abstraksi `DatabaseAdapter` Factory (`mock | google_sheets | postgres`).
* **Keamanan & Autentikasi:** `jose` untuk penandatanganan dan verifikasi token JWT berbasis Edge/Node, `bcryptjs` untuk pengacakan kata sandi, dan `rate-limiter-flexible` untuk pembatasan laju permintaan.
* **Pemantauan Kesalahan (Observability):** Sentry (`10.65`) terintegrasi untuk pelacakan eksepsi di sisi server maupun klien.

## 2. Arsitektur Kontainer & Infrastruktur Produksi
Sistem produksi `https://lapabook.my.id` berjalan di atas orkestrasi kontainer **Docker Compose** dengan spesifikasi ketersediaan tinggi berikut:
1. **Nama Layanan Kontainer:** `lapabook-app` dengan kebijakan pemulihan otomatis `restart: unless-stopped`.
2. **Isolasi Volume Persisten:**
   * `postgres_data` (External Volume): Menyimpan seluruh berkas basis data PostgreSQL 16 agar terpisah sepenuhnya dari siklus hidup kontainer aplikasi.
   * `uploads_data` (Persistent Volume): Dipetakan ke direktori `./uploads` (di luar folder publik `public/`) untuk menyimpan bukti transfer pembayaran pelanggan secara permanen dan aman.
3. **Prosedur Rebuild Tahan-Putus (`systemd-run`):** Setiap proses kompilasi ulang dan pembaruan kontainer produksi dieksekusi melalui unit transien `systemd-run` di mesin *host* agar proses *deployment* tetap berjalan tuntas meskipun sesi terminal atau koneksi agen terputus di tengah jalan.

## 3. Arsitektur Layanan Notifikasi Non-Blocking
Seluruh pengiriman notifikasi keluar (melalui `notification-service.ts`) dirancang dengan prinsip **Non-Blocking Best-Effort**:
* Saluran mencakup pengingat Email, tautan langsung WhatsApp (`wa.me` *deep link*) beserta kesiapan jembatan `whatsapp-web.js` (`wwebjs`), dan *Web Push Notification Service Worker*.
* Setiap panggilan pengiriman pesan dibungkus di dalam blok `try / catch` terisolasi dan dicatat ke dalam tabel log notifikasi. Apabila gateway pesan pihak ketiga mengalami gangguan, transaksi utama di basis data (seperti konfirmasi pembayaran atau pembuatan pesanan) dijamin tetap berhasil tanpa melemparkan *error* ke layar pengguna.

## 4. Arsitektur SEO & Canonical Routing
* Halaman tiket pemesanan menggunakan rute kanonis `/invoice/[id]`, sementara seluruh akses ke pola URL lama `/booking/*` diarahkan secara otomatis menggunakan pengalihan permanen **HTTP 308 Permanent Redirect**.
* Seluruh metadata SEO dan konten halaman statis (CMS) diambil secara dinamis dari tabel `platform_settings` di PostgreSQL dengan mekanisme *fallback* ke nilai awal (*seed*) jika tabel belum terisi.
