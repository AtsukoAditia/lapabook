"use client";

import Link from "next/link";
import { getSportVisual } from "@/lib/sport-icons";
import { useScrollReveal, useStaggerReveal } from "@/lib/animations";
import { useRef, useEffect, useState } from "react";
import type { Sport, Venue, Court } from "@/lib/types/domain";
import {
  Search,
  MapPin,
  Calendar,
  Check,
  ShieldCheck,
  Zap,
  MessageSquare,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Gift,
  Trophy,
  Medal,
  Gem,
  Diamond,
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  CloudRain,
  Dumbbell,
  Volleyball,
  Star,
} from "lucide-react";

const CANONICAL_SLUGS = new Set(["futsal","minisoccer","badminton","padel","tenis","basket"]);

export default function HomePage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/sports").then(r => r.json()).then(d => (d.sports ?? []) as Sport[]).catch(() => []),
      fetch("/api/venues").then(r => r.json()).then(d => (d.venues ?? []) as Venue[]).catch(() => []),
      fetch("/api/courts").then(r => r.json()).then(d => (d.courts ?? []) as Court[]).catch(() => []),
    ]).then(([s, v, c]) => {
      if (cancelled) return;
      const filtered = s.filter(x => CANONICAL_SLUGS.has(x.slug) && x.isActive);
      setSports(filtered.length ? filtered : s.filter(x => x.isActive).slice(0, 6));
      setVenues(v); setCourts(c); setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);
  const venueCount = venues.length;
  const courtCount = courts.length;
  const sportsRef = useScrollReveal<HTMLDivElement>();
  const stepsRef = useScrollReveal<HTMLDivElement>();
  const loyaltyRef = useScrollReveal<HTMLDivElement>();
  const ctaRef = useScrollReveal<HTMLDivElement>();
  const sportGridRef = useRef<HTMLDivElement>(null);
  const stepsGridRef = useRef<HTMLDivElement>(null);
  useStaggerReveal(sportGridRef, { count: 6, delay: 80 });
  useStaggerReveal(stepsGridRef, { count: 4, delay: 120 });

  return (
    <div className="min-h-screen">
      {/* Hero Section — token: primary blue #1E3A8A, accent #EA580C */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/10 animate-pulse" />
          <div className="absolute top-1/2 -left-10 h-60 w-60 rounded-full bg-white/5" />
          <div className="absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-white/10" />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line x1="0" y1="30" x2="100" y2="70" stroke="currentColor" strokeWidth="0.3" className="text-white/20" />
            <line x1="0" y1="50" x2="100" y2="90" stroke="currentColor" strokeWidth="0.2" className="text-white/15" />
            <line x1="0" y1="70" x2="100" y2="20" stroke="currentColor" strokeWidth="0.3" className="text-white/15" />
            <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-white/10" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 md:py-36">
          <div className="text-center">
            {/* Sport icon cluster — lucide, no emoji */}
            <div className="mb-6 flex items-center justify-center gap-3 text-white/90" aria-hidden="true">
              <Dumbbell className="h-8 w-8 sm:h-10 sm:w-10 animate-float" style={{ animationDelay: '0ms' }} />
              <Volleyball className="h-8 w-8 sm:h-10 sm:w-10 animate-float" style={{ animationDelay: '100ms' }} />
              <Trophy className="h-8 w-8 sm:h-10 sm:w-10 animate-float" style={{ animationDelay: '200ms' }} />
              <Volleyball className="h-8 w-8 sm:h-10 sm:w-10 animate-float" style={{ animationDelay: '300ms' }} />
              <Dumbbell className="h-8 w-8 sm:h-10 sm:w-10 animate-float" style={{ animationDelay: '400ms' }} />
            </div>

            <h1 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Lapa
              <span className="text-orange-400">book</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-blue-100 sm:text-xl md:text-2xl leading-relaxed">
              Booking lapangan olahraga jadi mudah, cepat, dan praktis.
              <br className="hidden sm:block" />
              Pilih venue, pilih waktu, langsung main.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/booking"
                className="group inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-10 py-4 text-lg font-bold text-white shadow-2xl transition-all hover:bg-orange-500 hover:shadow-3xl motion-safe:hover:scale-105"
              >
                <Trophy className="h-5 w-5" aria-hidden="true" />
                Booking Sekarang
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <a
                href="#sports"
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 px-10 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all hover:border-white hover:bg-white/10 motion-safe:hover:scale-105"
              >
                Lihat Olahraga
                <ChevronDown className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>

            {/* Search bar */}
            <div className="mt-8 mx-auto max-w-2xl">
              <div className="flex flex-col sm:flex-row gap-2 rounded-2xl bg-white p-2 shadow-2xl">
                <div className="flex-1 flex items-center gap-2 px-4 py-2">
                  <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <select id="hero-sport" defaultValue="futsal" className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none">
                    {(sports.length ? sports : [{ id: "futsal", slug: "futsal", name: "Futsal" } as Sport]).map(s => <option key={s.id} value={s.slug}>{s.name}</option>)}
                  </select>
                </div>
                <div className="hidden sm:block w-px bg-slate-200" aria-hidden="true" />
                <div className="flex-1 flex items-center gap-2 px-4 py-2">
                  <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input id="hero-area" placeholder="Cari area / venue (mis. Jakarta Selatan)" className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none" />
                </div>
                <button onClick={() => { const s = (document.getElementById('hero-sport') as HTMLSelectElement)?.value || 'futsal'; const q = (document.getElementById('hero-area') as HTMLInputElement)?.value; window.location.href = q ? `/cari/${s}?q=${encodeURIComponent(q)}` : `/cari/${s}`; }} className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white hover:bg-orange-500 transition cursor-pointer">Cari</button>
              </div>
              <p className="mt-2 text-xs text-blue-200 text-center">Coba: “futsal Jakarta Selatan” • “badminton Bandung” • “padel Surabaya”</p>
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 border border-white/20"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Pembayaran Aman</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 border border-white/20"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Venue Terverifikasi</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 border border-white/20"><Zap className="h-3.5 w-3.5" aria-hidden="true" /> Konfirmasi &lt;15 menit</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 border border-white/20"><MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> CS 08:00-22:00</span>
            </div>

            {/* Stats */}
            <div className="mt-14 grid grid-cols-3 gap-6 sm:gap-10 max-w-xl mx-auto">
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-4">
                <div className="text-3xl font-black text-orange-400 sm:text-4xl">{loading ? "—" : `${sports.length}+`}</div>
                <div className="mt-1 text-xs text-blue-200 sm:text-sm font-medium">Jenis Olahraga</div>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-4">
                <div className="text-3xl font-black text-orange-400 sm:text-4xl">{loading ? "—" : venueCount}</div>
                <div className="mt-1 text-xs text-blue-200 sm:text-sm font-medium">Venue</div>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-4">
                <div className="text-3xl font-black text-orange-400 sm:text-4xl">{loading ? "—" : courtCount}</div>
                <div className="mt-1 text-xs text-blue-200 sm:text-sm font-medium">Lapangan</div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0" aria-hidden="true">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80V40C240 10 480 0 720 15C960 30 1200 50 1440 40V80H0Z" fill="rgb(248 250 252)" />
          </svg>
        </div>
      </section>

      {/* Sports Section */}
      <section id="sports" ref={sportsRef} className="reveal mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-14">
          <span className="mb-3 inline-block rounded-full bg-blue-100 px-5 py-1.5 text-xs font-bold text-blue-800 tracking-wide uppercase">
            Pilih Olahraga
          </span>
          <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
            Olahraga yang Tersedia
          </h2>
          <p className="mt-3 text-slate-500 max-w-lg mx-auto">
            Pilih jenis olahraga favoritmu dan temukan lapangan terbaik di kotamu.
          </p>
        </div>

        <div ref={sportGridRef} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 sm:gap-6">
          {(loading ? [] : sports).map((sport) => {
            const { Icon, colorClass } = getSportVisual(sport.slug || sport.id);
            return (
              <Link
                key={sport.id}
                href={`/cari/${sport.slug}`}
                className="reveal-item group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all hover:border-blue-400 hover:shadow-xl hover:-translate-y-2 hover:shadow-blue-100"
              >
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 to-orange-500 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${colorClass} motion-safe:group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-8 w-8" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-800 sm:text-base transition-colors">
                  {sport.name}
                </h3>
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-blue-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Booking <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured venues */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="inline-block rounded-full bg-blue-100 px-4 py-1 text-xs font-bold text-blue-800 uppercase">Rekomendasi</span>
            <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Venue Unggulan</h2>
            <p className="text-sm text-slate-500 mt-1">Pilihan populer di berbagai kota — langsung booking.</p>
          </div>
          <Link href="/booking" className="hidden sm:inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800">Lihat semua <ArrowRight className="h-4 w-4 ml-1" aria-hidden="true" /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(loading ? [] : venues.slice(0, 6)).map(v => {
            const vCourts = courts.filter(c => c.venueId === v.id);
            const minPrice = vCourts.length ? Math.min(...vCourts.map(c => c.basePrice)) : 0;
            return (
              <Link key={v.id} href={`/venue/${v.id}`} className="group rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg hover:border-blue-300 transition">
                <div className="h-28 bg-gradient-to-br from-blue-700 to-blue-900 relative">
                  <div className="absolute inset-0 bg-black/10" aria-hidden="true" />
                  <div className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-800">{vCourts.length} lapangan • {v.openTime}-{v.closeTime}</div>
                  <div className="absolute top-3 right-3 rounded-full bg-orange-500 px-2.5 py-1 text-xs font-black text-white inline-flex items-center gap-1"><Star className="h-3 w-3 fill-white" aria-hidden="true" /> 4.8</div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-900 group-hover:text-blue-800 line-clamp-1">{v.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-1 inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden="true" /> {v.address}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-black text-blue-800">Mulai Rp {minPrice.toLocaleString('id-ID')}/jam</span>
                    <span className="text-xs font-semibold text-blue-700 group-hover:translate-x-0.5 transition inline-flex items-center">Booking <ArrowRight className="h-3 w-3 ml-0.5" aria-hidden="true" /></span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white border-y border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h2 className="text-center text-xl font-black text-slate-900 sm:text-2xl">Apa kata pemain?</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { name: "Riko, Jakarta", text: "Booking futsal jadi 2 menit beres. Bayar, upload bukti, langsung confirmed.", stars: 5 },
              { name: "Sinta, Bandung", text: "Suka fitur hold 15 menit. Nggak rebutan slot pas jam rame.", stars: 5 },
              { name: "Owner Greenfield", text: "Sejak pakai Lapabook, okupansi naik 30%. Kelola harga weekday/weekend gampang.", stars: 5 },
            ].map(t => (
              <div key={t.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="text-amber-500 text-sm flex gap-0.5" aria-label={`${t.stars} bintang`}>
                  {Array.from({ length: t.stars }).map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-500" aria-hidden="true" />)}
                </div>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed">“{t.text}”</p>
                <p className="mt-3 text-xs font-bold text-slate-900">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gradient-to-b from-slate-50 to-white">
        <div ref={stepsRef} className="reveal mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mb-10 text-center sm:mb-14">
            <span className="mb-3 inline-block rounded-full bg-blue-100 px-5 py-1.5 text-xs font-bold text-blue-800 tracking-wide uppercase">
              Mudah & Cepat
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Cara Booking
            </h2>
            <p className="mt-3 text-slate-500 max-w-lg mx-auto">
              Hanya 4 langkah mudah untuk booking lapangan favoritmu
            </p>
          </div>
          <div ref={stepsGridRef} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", Icon: Search,       title: "Pilih Olahraga",          desc: "Pilih jenis olahraga yang ingin dimainkan dari 6+ pilihan.", color: "from-blue-600 to-blue-700" },
              { step: "2", Icon: LayoutDashboard, title: "Pilih Venue & Lapangan",  desc: "Lihat venue terdekat dan lapangan yang tersedia.",            color: "from-blue-700 to-blue-800" },
              { step: "3", Icon: Calendar,     title: "Pilih Jadwal",             desc: "Pilih tanggal dan jam yang kamu inginkan, real-time!",        color: "from-orange-500 to-orange-600" },
              { step: "4", Icon: Check,        title: "Bayar & Main!",            desc: "Isi data, bayar, dan lapangan siap dipakai. Gampang!",        color: "from-orange-600 to-orange-700" },
            ].map((item) => (
              <div key={item.step} className="reveal-item group relative rounded-2xl bg-white p-6 text-center shadow-sm border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1">
                <div className={`absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${item.color} text-sm font-bold text-white shadow-lg`}>
                  {item.step}
                </div>
                <div className="mb-3 mt-4 flex justify-center">
                  <item.Icon className="h-10 w-10 text-blue-800 motion-safe:group-hover:scale-110 transition-transform" aria-hidden="true" />
                </div>
                <h3 className="mb-2 font-bold text-slate-900 text-lg">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Loyalty Points Section */}
      <section ref={loyaltyRef} className="reveal bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-1">
            <div className="rounded-3xl bg-white p-8 sm:p-12">
              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div>
                  <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-bold text-amber-800 tracking-wide uppercase">
                    <Gift className="h-3.5 w-3.5" aria-hidden="true" /> Program Loyalty
                  </span>
                  <h2 className="text-3xl font-black text-slate-900 sm:text-4xl mb-4">
                    Kumpulkan Poin,
                    <br />
                    <span className="text-orange-600">
                      Dapatkan Reward!
                    </span>
                  </h2>
                  <p className="text-slate-600 mb-6 leading-relaxed">
                    Daftar sekarang dan nikmati program loyalty Lapabook!
                    Setiap transaksi booking lapangan akan mendapatkan poin
                    yang bisa ditukarkan untuk diskon, bonus jam, bahkan
                    lapangan gratis!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:shadow-xl motion-safe:hover:scale-105"
                    >
                      <Sparkles className="h-5 w-5" aria-hidden="true" /> Daftar Gratis
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-8 py-3.5 text-base font-semibold text-slate-700 transition-all hover:border-blue-400 hover:text-blue-800"
                    >
                      Masuk <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { Icon: Trophy,  title: "Bronze",  desc: "1x Poin",   sub: "Member Baru" },
                    { Icon: Medal,   title: "Silver",  desc: "1.5x Poin", sub: "Spent 500rb+" },
                    { Icon: Gem,     title: "Gold",    desc: "2x Poin",   sub: "Spent 2jt+" },
                    { Icon: Diamond, title: "Diamond", desc: "3x Poin",   sub: "Spent 5jt+" },
                  ].map((tier) => (
                    <div key={tier.title} className="rounded-2xl border border-slate-100 p-4 text-center hover:shadow-md transition-all hover:-translate-y-1">
                      <tier.Icon className="mx-auto h-8 w-8 text-amber-600 mb-2" aria-hidden="true" />
                      <div className="font-bold text-slate-900">{tier.title}</div>
                      <div className="text-sm font-semibold text-orange-600">{tier.desc}</div>
                      <div className="text-xs text-slate-400 mt-1">{tier.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Owner CTA Section */}
      <section className="bg-slate-50 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-3xl bg-gradient-to-r from-blue-700 to-blue-900 p-1">
            <div className="rounded-3xl bg-white p-8 sm:p-12">
              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div>
                  <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-4 py-1.5 text-xs font-bold text-blue-800 tracking-wide uppercase">
                    <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" /> Untuk Pemilik Lapangan
                  </span>
                  <h2 className="text-3xl font-black text-slate-900 sm:text-4xl mb-4">
                    Daftarkan Venue Anda
                  </h2>
                  <p className="text-slate-600 mb-6 leading-relaxed">
                    Punya lapangan futsal, badminton, basket, atau olahraga lainnya?
                    Daftarkan venue Anda di Lapabook dan dapatkan akses ke ribuan pemain potensial.
                    Kelola booking, atur harga, dan lihat statistik venue Anda semuanya di satu tempat.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/dashboard/register"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-900 px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:shadow-xl motion-safe:hover:scale-105"
                    >
                      <Sparkles className="h-5 w-5" aria-hidden="true" /> Daftar Venue Sekarang
                    </Link>
                    <Link
                      href="/dashboard/login"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-8 py-3.5 text-base font-semibold text-slate-700 transition-all hover:border-blue-400 hover:text-blue-800"
                    >
                      Masuk ke Dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { Icon: BarChart3,  title: "Kelola Booking", desc: "Real-time & otomatis" },
                    { Icon: TrendingUp, title: "Atur Harga",     desc: "Weekday/Weekend/Holiday" },
                    { Icon: LayoutDashboard, title: "Lihat Statistik", desc: "Pendapatan & pengunjung" },
                    { Icon: CloudRain,  title: "Diskon Cuaca",   desc: "Otomatis saat hujan" },
                  ].map((feature) => (
                    <div key={feature.title} className="rounded-2xl border border-slate-100 p-4 text-center hover:shadow-md transition-all hover:-translate-y-1">
                      <feature.Icon className="mx-auto h-8 w-8 text-blue-800 mb-2" aria-hidden="true" />
                      <div className="font-bold text-slate-900">{feature.title}</div>
                      <div className="text-sm text-slate-500 mt-1">{feature.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-2xl font-black text-slate-900">FAQ</h2>
        <div className="mt-6 space-y-3">
          {[
            { q: "Berapa lama hold booking?", a: "Booking ditahan 15 menit (waiting_payment). Upload bukti bayar sebelum expired, status jadi waiting_verification lalu confirmed setelah verifikasi owner/admin." },
            { q: "Metode pembayaran apa saja?", a: "Transfer bank + upload bukti. Validasi magic-bytes, max 5MB. Poin loyalty hanya diberikan setelah confirmed." },
            { q: "Bisa refund / reschedule?", a: "Hubungi CS atau owner venue. Kebijakan refund mengikuti syarat venue masing-masing." },
            { q: "Bagaimana poin loyalty?", a: "Daftar gratis, kumpulkan poin tiap booking confirmed. Tier Bronze → Diamond dengan multiplier hingga 3x." },
          ].map(f => (
            <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white p-4 open:shadow-sm">
              <summary className="cursor-pointer list-none font-semibold text-slate-900 flex justify-between items-center">{f.q}<ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition" aria-hidden="true" /></summary>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="reveal bg-gradient-to-r from-blue-800 via-blue-900 to-blue-950 relative overflow-hidden">
        <div className="absolute inset-0" aria-hidden="true">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <circle cx="80" cy="20" r="20" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-white/10" />
            <circle cx="20" cy="80" r="15" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-white/10" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <h2 className="inline-flex items-center gap-3 text-3xl font-black text-white sm:text-4xl">
            Siap Bermain? <Trophy className="h-8 w-8 text-orange-400" aria-hidden="true" />
          </h2>
          <p className="mt-4 text-blue-100 text-lg max-w-lg mx-auto">
            Booking sekarang dan rasakan kemudahan Lapabook. Kumpulkan poin untuk reward eksklusif!
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-10 py-4 text-lg font-bold text-white shadow-2xl transition-all hover:bg-orange-500 motion-safe:hover:scale-105"
            >
              <Trophy className="h-5 w-5" aria-hidden="true" /> Mulai Booking
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/40 px-10 py-4 text-lg font-semibold text-white transition-all hover:border-white hover:bg-white/10"
            >
              <Gift className="h-5 w-5" aria-hidden="true" /> Daftar & Kumpulkan Poin
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
