import Link from "next/link";
import { Zap, ShieldCheck, Check } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-700 to-blue-900">
                <Zap className="h-4 w-4 text-orange-400" aria-hidden="true" />
              </div>
              <span className="text-lg font-black text-white">
                Lapa<span className="text-blue-400">book</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Booking lapangan olahraga jadi mudah, cepat, dan praktis. Futsal,
              badminton, padel, tenis, basket, minisoccer.
            </p>
            <div className="mt-4 flex gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Pembayaran Aman
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                <Check className="h-3 w-3" aria-hidden="true" /> Venue Terverifikasi
              </span>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-white">Jelajahi</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/cari" className="hover:text-white">Booking</Link></li>
              <li><Link href="/cari/futsal" className="hover:text-white">Cari Lapangan</Link></li>
              <li><Link href="/tentang" className="hover:text-white">Tentang Kami</Link></li>
              <li><Link href="/kontak" className="hover:text-white">Kontak</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-white">Bantuan</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/syarat" className="hover:text-white">Syarat &amp; Ketentuan</Link></li>
              <li><Link href="/kebijakan" className="hover:text-white">Kebijakan Privasi</Link></li>
              <li><Link href="/kontak" className="hover:text-white">Bantuan / CS</Link></li>
              <li><span className="text-slate-400">CS: 08:00-22:00 WIB</span></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-white">Untuk Pemilik Venue</h4>
            <p className="mb-3 text-sm text-slate-400">
              Punya lapangan? Daftarkan venue dan kelola booking otomatis.
            </p>
            <Link
              href="/dashboard/register"
              className="inline-flex rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-500"
            >
              Daftarkan Venue
            </Link>
          </div>
        </div>
        <div className="mt-10 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
          <span>© 2026 Lapabook. All rights reserved.</span>
          <span>Dibuat untuk olahraga Indonesia</span>
        </div>
      </div>
    </footer>
  );
}
