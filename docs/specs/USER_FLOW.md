# USER_FLOW.md — End-to-End Multi-Role User Flows

## 1. Alur Pemain (User / Guest): "2-Tap Fast Booking"
Transformasi alur pemesanan pemain mereduksi navigasi 4 halaman terpisah menjadi interaksi terpadu berbasis laci geser (*Bottom-Sheet*):
1. **Langkah 1 — Eksplorasi & Pilih Slot Inline (`/` atau `/cari`):**
   * Pengguna memilih pil kota (misal: *Jakarta Selatan*), tanggal bermain, dan pil cabang olahraga (*Futsal, Mini Soccer, Badminton, Padel, Tennis, Basketball*) pada header yang menempel (*sticky*).
   * Setiap kartu venue langsung menampilkan **Inline Time-Slot Ribbon** (pita jam ketersediaan horizontal) untuk hari tersebut lengkap dengan indikator *Peak* atau *Diskon Hujan*.
   * Pengguna mengetuk satu atau beberapa slot jam langsung pada kartu venue (mendukung *multi-slot* dan *recurring booking*).
2. **Langkah 2 — Konfirmasi di Bottom-Sheet Checkout (`/checkout` Drawer):**
   * **Sticky Checkout Bar** muncul di atas navigasi bawah menampilkan total harga *live* dan pilihan radio cepat: **Bayar Lunas (100%)** atau **DP 50%**.
   * Pengguna mengetuk **Lanjut Bayar**, yang langsung mengangkat laci *Checkout* tanpa berpindah halaman.
   * Pengguna tamu (*Guest*) cukup mengisi Nama, Nomor WhatsApp, dan Email (otomatis tersimpan di `localStorage` untuk kunjungan berikutnya), memilih tambahan *1-Tap Add-Ons* opsional, lalu menekan salah satu dari dua CTA: **Bayar Instan (Midtrans Snap)** atau **Transfer Manual (6 Metode: BCA, BNI, GoPay, OVO, Dana, QRIS)**.
3. **Langkah 3 — Tahanan 15 Menit & Digital Boarding Pass (`/checkout/success?code=` -> `/invoice/[id]`):**
   * Pesanan berstatus `waiting_payment` selama 15 menit dengan *polling* status otomatis setiap 5 detik dan penghitung mundur *real-time*.
   * Jika menggunakan metode manual, pengguna mengunggah foto bukti transfer (divalidasi dengan *magic-bytes* maksimal 5MB), yang mengubah status menjadi `waiting_verification` hingga dikonfirmasi menjadi `confirmed` / `paid` / `dp_paid`.
   * Setelah terkonfirmasi, pengguna dapat mengunduh jadwal ke kalender (`.ICS`), membagikan tagihan patungan ke WhatsApp, atau membuka slot ke *Public Mabar*.

## 2. Alur Kapten Tim: Konversi "Private Booking" ke "Public Mabar" & Split Bill
1. **Konversi ke Public Mabar:**
   * Kapten tim yang sudah memiliki pesanan berstatus `confirmed`, `paid`, atau `dp_paid` membuka halaman tiket `/invoice/[id]`.
   * Kapten menekan tombol **"Kurang Pemain? Buka Slot ke Public Mabar"**, memasukkan jumlah kursi kosong (misal: kurang 2 orang) dan biaya patungan per orang, lalu mempublikasikannya.
   * Sesi langsung muncul di halaman `/mabar` dengan lencana **"Lapangan Sudah Diamankan"**, memungkinkan pemain publik bergabung dan membayar porsinya secara langsung.
2. **Patungan Tim (Team Wallet & Split Bill):**
   * Kapten membuka `/profile/wallet/[id]`, memilih tab **Split**, dan membuat tagihan patungan otomatis dari transaksi *booking*.
   * Kapten membagikan tautan tagihan ke grup WhatsApp. Anggota tim membuka tautan, melunasi porsinya, dan buku besar (*ledger*) memperbarui status anggota menjadi `Lunas` secara *real-time*.

## 3. Alur Owner Lapangan: "Magic Onboarding" & Manajemen Bisnis (`/dashboard`)
1. **Pendaftaran Mandiri 60 Detik (`/dashboard/register`):**
   * Pemilik lapangan mendaftar dan masuk ke *Venue Wizard 3-Step*.
   * Pemilik menempelkan URL Google Maps (`mapsUrl`) dan mencentang cabang olahraga yang tersedia; sistem secara otomatis men-generasi entitas lapangan (*auto-create court*) beserta templat harga dasar.
2. **Konfigurasi Harga & Staf Kasir:**
   * Pemilik mengatur tarif hari kerja (*weekday*), akhir pekan (*weekend*), pengali jam sibuk, serta mengaktifkan **Diskon Cuaca Otomatis (`rain-factor`)**.
   * Pemilik membuka menu `/dashboard/staff` untuk membuat akun khusus bagi penjaga lapangan (`role: 'venue_staff'`) yang ditugaskan ke venue tersebut.
3. **Pemantauan Analitik & Pencairan Dana (*Payout*):**
   * Pemilik memantau grafik SVG pendapatan/okupansi dan mengajukan penarikan saldo bersih (`SUM paid+confirmed minus payouts`) ke rekening bank.

## 4. Alur Admin Lapangan (Penjaga / Kasir Venue): "Field Keeper POS" (`/dashboard/kasir`)
1. **Pemantauan Jadwal Harian (Tape Chart):**
   * Saat penjaga lapangan login, sistem langsung mengarahkan ke `/dashboard/kasir` yang menampilkan matriks jam vertikal dan kolom lapangan horizontal untuk hari berjalan.
2. **Blokir Tamu Walk-In 1 Ketukan (3 Detik):**
   * Ketika ada pelanggan datang langsung ke meja kasir, penjaga mengetuk slot jam kosong pada layar ponsel/tablet, memasukkan nama singkat tamu dan memilih status (`Lunas Tunai` atau `DP Tunai`), lalu menekan **Kunci Slot**. Slot langsung tertutup di halaman publik Lapabook.
3. **Verifikasi Bukti Bayar & Pelunasan DP 50% (`Settlement`):**
   * Penjaga memeriksa gambar bukti bayar yang masuk pada laci verifikasi dan menekan **Terima** atau **Tolak**.
   * Saat pemain berstatus `dp_paid` tiba di lapangan dan membayar sisa 50% di kasir, penjaga menekan tombol **Terima Pelunasan (Settlement)** pada blok jadwal tersebut sehingga status berubah menjadi `paid`.

## 5. Alur Admin Lapabook & Superadmin (Portal Rahasia 24-Hex)
1. **Admin Operasional Lapabook (`ops_admin`):**
   * Masuk melalui URL rahasia 24 karakter heksadesimal, memproses antrean pembayaran manual agar terpenuhi di bawah 15 menit, menyetujui pendaftaran venue baru, memoderasi ulasan foto, dan membantu pelanggan melakukan *reschedule* (1x H-3) atau *refund* melalui tombol pintas WhatsApp (`wa.me`).
2. **Superadmin (`superadmin`):**
   * Mengelola pengaturan komisi platform, mengubah konten CMS dan SEO yang tersimpan di tabel `platform_settings`, mengeksekusi persetujuan akhir pencairan dana mitra (`payouts paid`), serta memeriksa catatan keamanan di `audit_logs`.
