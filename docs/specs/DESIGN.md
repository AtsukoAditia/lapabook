# DESIGN.md — UI/UX & Design System Specification

## 1. Filosofi Desain: "Tactical Sport-Tech Minimalist"
Desain antarmuka Lapabook meninggalkan pola halaman web direktori tradisional dan beralih sepenuhnya ke paradigma **App-Shell Mobile-First PWA**. Antarmuka dirancang agar memiliki kontras tinggi sehingga tetap tajam saat dibaca di bawah terik matahari lapangan terbuka (*outdoor mini soccer/tennis/padel*), bebas dari dekorasi visual yang mengganggu, dan menempatkan seluruh tombol aksi utama di dalam zona jangkauan ibu jari (*thumb-zone*).

## 2. Arsitektur Tata Letak (Viewport & App-Shell)
* **Mobile Container (`< 768px`):** Menggunakan bingkai aplikasi vertikal yang memperhitungkan area aman layar perangkat seluler melalui properti CSS `env(safe-area-inset-top)` dan `env(safe-area-inset-bottom)`.
* **Persistent Bottom Navigation Bar:** Bilah navigasi bawah setinggi `64px` yang selalu menempel di bagian bawah layar ponsel (`md:hidden`) dengan maksimal 5 tab utama sesuai peran pengguna.
* **Slide-Up Bottom Sheet Drawers:** Menggantikan perpindahan halaman penuh (*full-page reload*) untuk pemilihan detail lapangan, rincian *checkout*, dan konfirmasi bukti bayar kasir.
* **Desktop Responsive Adaptation (`>= 768px`):** Menyembunyikan *Bottom Navigation Bar* dan beralih ke tata letak *Split-View* (panel filter/kalender di kiri, matriks detail/checkout yang menempel atau *sticky* di kanan).

## 3. Sistem Warna & Token Semantik (Tailwind CSS)

| Token / Alias Tailwind | Kode Hex | Peruntukan Elemen UI |
| :--- | :--- | :--- |
| `bg-slate-50` | `#F8FAFC` | Latar belakang utama kanvas aplikasi (mengurangi silau layar dibanding putih murni). |
| `bg-white` | `#FFFFFF` | Permukaan kartu venue, laci *bottom-sheet*, dan sel slot waktu yang tersedia (`border-slate-200`). |
| `accent-primary` | `#0F172A` | Warna teks utama (*Midnight Navy*), latar tombol CTA utama, dan latar slot jadwal yang sedang dipilih (*Selected*). |
| `accent-emerald` | `#10B981` | Indikator ketersediaan slot, lencana status `Confirmed / Paid`, dan sorotan harga aktif (*Electric Emerald*). |
| `accent-amber` | `#F59E0B` | Status tahanan 15 menit (`waiting_payment`), lencana `DP 50%`, dan antrean verifikasi bukti bayar. |
| `accent-cyan` | `#06B6D4` | Lencana diskon otomatis cuaca hujan (`Rain Discount`) dan promo tarif *off-peak*. |
| `accent-violet` | `#8B5CF6` | Indikator slot **Open Mabar** (pertandingan terbuka yang sedang mencari tambahan pemain). |
| `accent-rose` | `#F43F5E` | Peringatan batas waktu hampir habis (< 3 menit), pembatalan, atau penolakan bukti bayar. |

## 4. Matriks Status Visual Slot Jadwal (Court Slot Visual States)
Setiap blok jam pada pita jadwal horizontal maupun kalender kasir wajib mematuhi pengkodean visual berikut agar dapat dikenali dalam satu lirikan mata:
1. **Available (Tersedia):** Latar `#FFFFFF`, teks `#0F172A`, garis tepi `1px solid #CBD5E1`.
2. **Selected (Dipilih Pengguna):** Latar `#0F172A`, teks `#FFFFFF`, lencana harga berwarna `#10B981`.
3. **Hold 15 Menit (`waiting_payment`):** Latar `#FEF3C7` (*Amber-100*), garis tepi putus-putus `1px dashed #F59E0B`, ikon jam pasir Lucide `Hourglass`, serta tombol kecil *"Antre Slot"*.
4. **Booked / Penuh (`confirmed` / `paid`):** Latar `#F1F5F9` (*Slate-100*), teks `#94A3B8` (*muted*), tidak dapat dipilih untuk *booking* baru.
5. **Open Mabar (Tersedia Kursi Patungan):** Latar `#F5F3FF` (*Violet-50*), garis tepi `#8B5CF6`, lencana jumlah kursi kosong (misal: *"Kurang 2 Pemain"*).
6. **Dynamic Deal (Diskon Hujan / Off-Peak):** Latar `#ECFEFF` (*Cyan-50*), garis tepi `#06B6D4`, teks harga normal dicoret (*strikethrough*) di samping harga diskon.

## 5. Tipografi, Ikonografi & Standar Aksesibilitas
* **Fon Utama (UI & Kode Alfanumerik):** `Atkinson Hyperlegible` — dipilih secara spesifik karena kejelasan ekstrem dalam membedakan karakter mirip (seperti `0` vs `O`, `1` vs `I` vs `l`) pada kode *booking* (`BookingCodeRef`) dan nomor rekening.
* **Fon Monospace (Angka, Timer & Harga):** `JetBrains Mono` — wajib digunakan pada komponen penghitung mundur 15 menit (*countdown timer*), label jam slot (`19:00 - 20:00`), dan tabel nominal transaksi.
* **Kebijakan Tanpa Emoji (Zero-Emoji Policy):** Seluruh halaman publik (`/`, `/cari`, `/venue`, `/checkout`), portal pelanggan (`/profile`), portal pemilik (`/dashboard`), dan portal admin wajib menggunakan ikon vektor dari pustaka `lucide-react` dengan atribut `aria-hidden="true"` (0 karakter emoji di seluruh kode sumber).
* **Ergonomi Sentuh (Touch Targets):** Setiap elemen interaktif (pil olahraga, blok jam, tombol aksi) wajib memiliki dimensi area sentuh minimal `44px x 44px` dengan atribut `aria-label` yang deskriptif.
