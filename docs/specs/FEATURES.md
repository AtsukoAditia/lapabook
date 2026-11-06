# FEATURES.md — Product Feature Inventory & Killer Differentiators

## 1. Inventaris Fitur Eksisting Produksi (`lapabook.my.id`)
1. **Corong Publik & Eksplorasi:**
   * Halaman utama (`/`), direktori pencarian (`/cari`, `/cari/[sport]`, `/cari/[sport]/[courtId]`), dan halaman detail venue (`/venue/[venueId]`) dengan *sticky checkout bar*.
   * Pemesanan multi-slot (*multi-slot*), pemesanan berulang (*recurring booking*), opsi pembayaran lunas atau DP 50%, pencarian pesanan via kode, obrolan bantuan (*support chat*), dan dukungan PWA *offline* (`/offline`) beserta *install prompt*.
2. **Ekosistem Pelanggan (`/profile`):**
   * Manajemen akun JWT, riwayat pesanan, *reschedule* 1x H-3, permintaan *refund*, dan pelunasan sisa DP (*settlement*).
   * Sistem poin loyalitas berjenjang, penukaran *voucher* atomik (`LAPABOOK10`, `GRATISMAIN`), kode referral, 18 *achievements*, *streaks*, *leaderboard*, daftar venue favorit, dan ulasan pelanggan dengan unggahan maksimal 3 foto.
3. **Ekosistem Sosial & Komunitas (`/mabar` & `/profile/wallet`):**
   * Direktori Mabar (`/mabar`, `/mabar/[id]`, `/mabar/buat`), manajemen partisipan, *group booking* dengan mekanisme undangan dan pemungutan suara (*vote*), serta *Team Wallet* dengan fitur pembagian tagihan (*split bill*) otomatis.
4. **Manajemen Mitra Venue (`/dashboard`) & Portal Admin:**
   * Analitik SVG murni (*Line, Pie, Heatmap*) untuk memantau pendapatan, okupansi, dan jam ramai (*peak hours*), wizard pembuatan venue 3 langkah, manajemen tarif & diskon hujan, pengajuan *payout*, serta portal admin lengkap dengan pencatatan `audit_logs`.

## 2. Enam Fitur Unggulan Pembeda (Killer Features vs Kompetitor)

| Fitur Unggulan Lapabook | Keunggulan Dibandingkan AYO, Gelora, Kuyy & Playtomic | Nilai Bisnis Utama |
| :--- | :--- | :--- |
| **1. Konversi Private Booking ke Public Mabar Lintas 6 Olahraga** | Playtomic membatasi konversi hanya untuk Padel/Tenis dan mewajibkan semua pemain punya akun. Lapabook membukanya untuk seluruh 6 cabang olahraga (termasuk Futsal, Mini Soccer, Badminton, Basket) baik untuk status Lunas maupun DP 50%. | Menyelamatkan kapten tim yang kekurangan pemain pada H-1 sekaligus mendatangkan pengguna baru dari komunitas Mabar. |
| **2. Team Wallet & Patungan Anti-Nombok via Link WA** | Kompetitor lokal (AYO & Gelora) belum memiliki dompet tim berlapis buku besar (*ledger*). Di Lapabook, kapten tim cukup membagikan tautan tagihan ke grup WhatsApp dan anggota dapat melunasi porsinya via QRIS/e-Wallet dalam 10 detik. | Menghilangkan beban kapten tim menalangi uang kas dan mengakuisisi nomor WA anggota tim secara organik (*merge-by-phone*). |
| **3. Garansi Cuaca & Dynamic Yield Engine (`rain-factor`)** | Kompetitor lokal umumnya menerapkan tarif statis. Lapabook memiliki mesin pengali harga otomatis berdasarkan jam/permintaan serta diskon cuaca hujan otomatis untuk lapangan *outdoor*. | Meningkatkan okupansi venue pada jam sepi/hujan dan memberikan rasa aman bagi pemesan lapangan terbuka. |
| **4. Smart Waitlist & Auto-Snatch 15 Menit** | Memanfaatkan jeda tahanan 15 menit (`waiting_payment`). Pemain lain yang mengincar jam *prime-time* dapat menekan *"Antre Slot Ini"* dan langsung menerima tautan *checkout* via WA detik ketika tahanan pemesan pertama kedaluwarsa. | Memastikan tingkat keterisian (*fill-rate*) 100% pada jam emas (18:00–22:00) tanpa ada slot yang terbuang. |
| **5. One-Tap Add-Ons di Laci Checkout** | Mengintegrasikan penjualan ekstra satu ketukan langsung di dalam laci *checkout* (sewa raket Padel, bola baru, paket minuman isotonik 1 tim, wasit, atau fotografer). | Meningkatkan nilai transaksi rata-rata (*Average Order Value* / AOV) dan margin keuntungan pemilik venue. |
| **6. White-Label Bio-Link Micro-Site (`/v/[slug]`)** | Menyediakan halaman khusus bagi tiap venue untuk dipasang di Bio Instagram mereka tanpa menampilkan daftar venue pesaing di sekitarnya. | Menghilangkan ketakutan pemilik venue bahwa pelanggan setia mereka akan berpindah ke kompetitor saat memesan lewat aplikasi. |

## 3. Antrean Fitur Ekspansi (Backlog P3)
* **Operasional & Keamanan Venue:** Tangkapan layar kamera langsung (*Live Cam full 30-menit capture*), verifikasi dokumen venue secara menyeluruh (*venue verification full*), dan sistem kupon promo mandiri oleh pemilik venue (*owner promo*).
* **Eksplorasi & Retensi Pemain:** Pencarian berbasis lokasi terdekat (*near-me geo*), filter fasilitas detail (parkir luas, mushola, *shower* air hangat, tribun), antarmuka *Flash Deals*, rekomendasi pintar (*smart recommendation UI*), penyimpanan draf pesanan lintas perangkat (*booking_drafts + session token cross-device*), dan klaim poin otomatis berdasarkan pencocokan nomor telepon (*merge-by-phone*).
* **Monetisasi Lanjutan:** Pembuat bagan turnamen (*tournament builder*), paket langganan/keanggotaan (*subscription/membership*), dan penempatan iklan venue unggulan (*promoted venues/ads*).
