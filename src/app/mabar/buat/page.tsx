"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, MapPin, Dumbbell } from "lucide-react";

interface Sport { slug: string; name: string }
interface Venue { id: string; name: string; areaId?: string }
interface Court { courtId: string; courtName: string; venueId: string }

const fmt = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

export default function BuatMabarPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [sports, setSports] = useState<Sport[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [allCourts, setAllCourts] = useState<Court[]>([]);

  const [form, setForm] = useState({
    title: "",
    sportType: "",
    venueId: "",
    courtId: "",
    scheduledAt: "",
    durationMinutes: 60,
    maxPlayers: 10,
    totalPrice: 0,
    skillLevel: "all" as "all" | "beginner" | "intermediate" | "advanced",
    description: "",
  });

  const pricePerPerson = form.maxPlayers > 0 ? form.totalPrice / form.maxPlayers : 0;

  // Auth check
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.user || d.user.role !== "customer") {
          router.push("/login");
        } else {
          setAuthChecked(true);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  // Load dropdown data
  useEffect(() => {
    if (!authChecked) return;

    const ac = new AbortController();
    fetch("/api/sports", { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.sports ?? d.data ?? []);
        setSports(Array.isArray(list) ? list : []);
      })
      .catch(() => {});

    fetch("/api/venues", { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.venues ?? d.data ?? []);
        setVenues(Array.isArray(list) ? list : []);
      })
      .catch(() => {});

    fetch("/api/search/courts?limit=50", { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.courts ?? d.data ?? []);
        setAllCourts(Array.isArray(list) ? list : []);
      })
      .catch(() => {});

    return () => ac.abort();
  }, [authChecked]);

  const venueCourts = allCourts.filter((c) => c.venueId === form.venueId);
  const selectedVenue = venues.find((v) => v.id === form.venueId);

  const set = (k: string, v: string | number) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title || !form.sportType || !form.scheduledAt || !form.maxPlayers || !form.totalPrice) {
      setError("Lengkapi semua field yang wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/pickup-games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          sportType: form.sportType,
          courtId: form.courtId || undefined,
          venueId: form.venueId || undefined,
          scheduledAt: form.scheduledAt,
          durationMinutes: form.durationMinutes,
          maxPlayers: form.maxPlayers,
          totalPrice: form.totalPrice,
          pricePerPerson: Math.round(form.totalPrice / form.maxPlayers),
          description: form.description,
          skillLevel: form.skillLevel,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (r.status === 401) { router.push("/login"); return; }
        setError(d.error || "Gagal membuat mabar");
        return;
      }
      const newId = d.data?.id ?? d.id;
      if (newId) router.push(`/mabar/${newId}`);
      else router.push("/mabar");
    } catch {
      setError("Gagal membuat mabar");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-800 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <Link href="/mabar" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-blue-800">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Buat Mabar</h1>
            <p className="mt-1 text-sm text-slate-500">Ajak orang lain main bareng, patungan bayar lapangan</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Judul Mabar *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Contoh: Futsal Jumat Malam, Butuh 2 Lawan"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {/* Sport + Skill */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Olahraga *</label>
                <select
                  value={form.sportType}
                  onChange={(e) => set("sportType", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="">Pilih olahraga</option>
                  {sports.map((s) => (
                    <option key={s.slug} value={s.slug}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Level Skill</label>
                <select
                  value={form.skillLevel}
                  onChange={(e) => set("skillLevel", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">Semua Level</option>
                  <option value="beginner">Pemula</option>
                  <option value="intermediate">Menengah</option>
                  <option value="advanced">Mahir</option>
                </select>
              </div>
            </div>

            {/* Venue + Court */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-slate-700">
                  <MapPin className="h-3.5 w-3.5" /> Venue
                </label>
                <select
                  value={form.venueId}
                  onChange={(e) => { set("venueId", e.target.value); set("courtId", ""); }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Pilih venue</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-slate-700">
                  <Dumbbell className="h-3.5 w-3.5" /> Lapangan
                </label>
                <select
                  value={form.courtId}
                  onChange={(e) => set("courtId", e.target.value)}
                  disabled={!form.venueId}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">
                    {!form.venueId ? "Pilih venue dulu" : "Pilih lapangan"}
                  </option>
                  {venueCourts.map((c) => (
                    <option key={c.courtId} value={c.courtId}>{c.courtName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* DateTime + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tanggal & Jam *</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => set("scheduledAt", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Durasi (menit)</label>
                <select
                  value={form.durationMinutes}
                  onChange={(e) => set("durationMinutes", Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value={60}>60 menit</option>
                  <option value={90}>90 menit</option>
                  <option value={120}>120 menit</option>
                  <option value={150}>150 menit</option>
                  <option value={180}>180 menit</option>
                </select>
              </div>
            </div>

            {/* Max players + Total price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Maks. Pemain * (2-20)</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={form.maxPlayers}
                  onChange={(e) => set("maxPlayers", Math.min(20, Math.max(2, Number(e.target.value))))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Total Biaya *</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.totalPrice}
                  onChange={(e) => set("totalPrice", Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Price per person preview */}
            {form.totalPrice > 0 && form.maxPlayers > 0 && (
              <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-sm">
                <span className="font-semibold text-orange-700">
                  {fmt(pricePerPerson)}/orang
                </span>
                <span className="ml-1 text-orange-600">· {form.maxPlayers} pemain</span>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Deskripsi</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Detail tambahan: aturan, perlengkapan bawa sendiri, dll."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
            >
              {submitting ? "Membuat..." : "Buat Mabar Sekarang"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
