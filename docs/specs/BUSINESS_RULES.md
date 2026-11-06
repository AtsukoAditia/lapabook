# BUSINESS_RULES.md — Core Business Logic & Validation Rules

## 1. Siklus Status Pemesanan (Booking State Machine)
Setiap transaksi pemesanan lapangan di Lapabook bergerak melalui transisi status yang dikontrol ketat oleh layanan *backend* dan basis data:
1. `waiting_payment` / `unpaid` (**Hold 15 Menit**): Status awal saat pesanan dibuat. Slot lapangan langsung dikunci selama 15 menit agar tidak dapat dipesan oleh orang lain.
2. `waiting_verification` / `waiting_confirmation`: Status ketika pelanggan telah mengunggah bukti transfer manual dalam batas waktu 15 menit dan sedang menunggu pemeriksaan Admin Lapabook, Owner, atau Admin Lapangan.
3. `confirmed` / `paid`: Status ketika pembayaran lunas 100% telah diverifikasi secara manual atau dibayar otomatis melalui webhook Midtrans Snap.
4. `dp_paid`: Status ketika pelanggan memilih opsi **DP 50%** dan pembayaran uang muka sebesar 50% telah terverifikasi.
5. `settlement` -> `paid`: Transisi pelunasan sisa 50% tagihan dari pesanan berstatus `dp_paid`, baik dibayar secara online melalui halaman profil/tiket maupun ditandai lunas secara tunai/QRIS oleh Admin Lapangan di meja kasir.
6. `expired`: Status akhir apabila waktu 15 menit pada `waiting_payment` habis tanpa adanya pembayaran atau unggahan bukti bayar. Slot lapangan secara otomatis dilepas kembali ke publik melalui mekanisme *lazy cleanup* (saat kueri ketersediaan dipanggil) maupun eksekusi cron `GET /api/cron/expire-bookings`.

## 2. Aturan Anti Double-Booking
* Sistem menerapkan validasi ganda pada lapisan layanan (*service layer*) dan kueri SQL untuk memeriksa tumpang tindih waktu (*overlap check*) berdasarkan kombinasi `court_id + booking_date + time_slot`.
* Apabila terdapat pesanan lain pada slot yang sama dengan status aktif (`waiting_payment` yang belum kedaluwarsa, `waiting_verification`, `confirmed`, `paid`, atau `dp_paid`), server wajib menolak permintaan baru dengan kode status HTTP `409 Conflict` dan mencatat kejadian tersebut ke dalam `AuditLogEntry`.

## 3. Aturan Mesin Harga Dinamis (Dynamic Pricing Engine)
Harga akhir sebuah slot dihitung secara dinamis dari tarif dasar lapangan (*base price*) dengan menerapkan faktor pengali berikut serta menampilkan harga asli yang dicoret (*strikethrough preview*) apabila terdapat diskon:

| Kondisi / Parameter Waktu & Permintaan | Faktor Pengali (Multiplier) | Efek pada Tarif Dasar |
| :--- | :--- | :--- |
| **Jam Sibuk (*Peak Hours* 17:00 – 21:00)** | `1.25x` | Kenaikan +25% pada jam utama malam hari. |
| **Permintaan Tinggi (*High Demand*)** | `1.20x` | Kenaikan +20% saat tingkat keterisian venue melampaui ambang batas. |
| **Akhir Pekan & Hari Libur (*Weekend*)** | `1.15x` | Kenaikan +15% dari tarif hari kerja. |
| **Tarif Standar (*Base Weekday*)** | `1.00x` | Tarif acuan normal. |
| **Jam Malam Larut (*Night Slot* > 21:00)** | `0.95x` | Potongan harga -5% untuk mengoptimalkan jam menjelang tutup. |
| **Jam Pagi (*Early Bird*) & Permintaan Rendah (*Low Demand*)** | `0.90x` | Potongan harga -10% untuk mendorong okupansi jam sepi. |
| **Diskon Cuaca Hujan (*Rain Discount / `rain-factor`*)** | Sesuai konfigurasi venue | Potongan otomatis yang diaktifkan oleh pemilik venue saat kondisi hujan. |

## 4. Aturan Reschedule, Refund & Pembatalan
* **Batas Reschedule:** Pelanggan hanya diizinkan melakukan perubahan jadwal (*reschedule*) maksimal **1 kali** per kode *booking*, dan pengajuan wajib dilakukan paling lambat **H-3** (72 jam) sebelum jam bermain dimulai.
* **Kebijakan Refund:** Pengajuan *refund* melalui profil pelanggan akan masuk ke antrean moderasi Admin/Owner (`refund-approve` / `refund-reject`) dan memicu notifikasi konfirmasi via WhatsApp sesuai syarat dan ketentuan masing-masing venue.

## 5. Aturan Poin Loyalitas, Tier, Referral & Voucher
* **Perolehan Poin Dasar:** Setiap kelipatan **Rp10.000** dari nilai transaksi yang telah berstatus `confirmed` / `paid` menghasilkan **10 poin dasar**. Poin hanya diberikan setelah pesanan terkonfirmasi dan dicatat pada buku besar transaksional (*transactional ledger*) dengan kunci anti-ganda (*anti-double award*).
* **Pengali Tier Loyalitas:**
  * **Bronze** (Member Baru): Pengali `1.0x`.
  * **Silver** (Akumulasi Transaksi >= Rp500.000): Pengali `1.5x`.
  * **Gold** (Akumulasi Transaksi >= Rp2.000.000): Pengali `2.0x`.
  * **Platinum / Diamond** (Akumulasi Transaksi >= Rp5.000.000): Pengali `3.0x`.
* **Program Referral & Voucher:** Pemberian saldo/reward referral sebesar Rp50.000 / Rp25.000 serta penukaran kode *voucher* (`LAPABOOK10`, `GRATISMAIN`) dieksekusi secara atomik di basis data agar tidak dapat diklaim berulang kali melalui serangan *race condition*.

## 6. Aturan Saldo Venue & Pencairan Dana (Owner Payout)
* Saldo bersih yang dapat ditarik oleh pemilik lapangan dihitung dengan rumus:
  `Available Payout Balance = SUM( Transaksi berstatus paid / confirmed milik venue ) - Komisi Platform - SUM( Payout yang sudah diajukan/dibayar )`.
* Penjaga lapangan (`venue_staff`) tidak memiliki akses untuk melihat maupun mengajukan pencairan saldo ini; pengajuan hanya dapat dilakukan oleh `owner` dan pencairan akhir (`payout_paid`) hanya dapat disetujui oleh `superadmin`.
