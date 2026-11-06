"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSportVisual } from "@/lib/sport-icons";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  SearchX,
  Plus,
} from "lucide-react";

interface PickupGame {
  id: string;
  title: string;
  sport_type: string;
  scheduled_at: string;
  duration_minutes: number;
  max_players: number;
  current_players: number;
  price_per_person: number | string;
  status: string;
  skill_level: string;
  venue_name?: string;
  court_name?: string;
  host_name?: string;
}

const SKILL_LABEL: Record<string, string> = {
  all: "Semua Level",
  beginner: "Pemula",
  intermediate: "Menengah",
  advanced: "Mahir",
};

const SKILL_STYLE: Record<string, string> = {
  all: "bg-slate-100 text-slate-700",
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-orange-100 text-orange-700",
};

const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID");

function formatDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
}

function formatTime(s: string) {
  const d = new Date(s);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function MabarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <MabarContent />
    </Suspense>
  );
}

function MabarContent() {
  const sp = useSearchParams();
  const [games, setGames] = useState<PickupGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sports, setSports] = useState<Array<{ slug: string; name: string }>>([]);
  const [sport, setSport] = useState(sp.get("sport") || "");
  const [skill, setSkill] = useState(sp.get("skill") || "");
  const [date, setDate] = useState(sp.get("date") || "");

  useEffect(() => {
    fetch("/api/sports")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.sports ?? d.data ?? []);
        setSports(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    params.set("status", "open");
    if (sport) params.set("sport", sport);
    if (skill) params.set("skill_level", skill);
    if (date) params.set("date", date);

    fetch(`/api/pickup-games?${params}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat data");
        return r.json();
      })
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.data ?? d.games ?? []);
        setGames(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError(e.message || "Gagal memuat data");
        setGames([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [sport, skill, date]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 px-4 pb-8 pt-10 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <nav className="mb-3 text-xs text-blue-200">
            <Link href="/" className="hover:text-white">Beranda</Link>
            <span> / Mabar</span>
          </nav>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black sm:text-3xl">Mabar — Main Bareng</h1>
              <p className="text-blue-200">Cari lawan & teman main, patungan bayar lapangan</p>
            </div>
            <Link
              href="/mabar/buat"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-500"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Buat Mabar
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Filter bar */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            aria-label="Filter olahraga"
          >
            <option value="">Semua Olahraga</option>
            {sports.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
          <select
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            aria-label="Filter skill"
          >
            <option value="">Semua Level</option>
            <option value="beginner">Pemula</option>
            <option value="intermediate">Menengah</option>
            <option value="advanced">Mahir</option>
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            aria-label="Filter tanggal"
          />
          <button
            onClick={() => { setSport(""); setSkill(""); setDate(""); }}
            className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
          >
            Reset Filter
          </button>
        </div>

        <div className="mb-4 text-sm text-slate-500">
          {loading ? "Memuat..." : `${games.length} mabar terbuka`}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : !error && games.length === 0 ? (
          <div className="py-20 text-center">
            <SearchX className="mx-auto mb-3 h-14 w-14 text-slate-300" aria-hidden="true" />
            <p className="font-medium text-slate-500">Belum ada mabar terbuka</p>
            <p className="mt-1 text-sm text-slate-400">Jadilah yang pertama bikin mabar</p>
            <Link
              href="/mabar/buat"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-500"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Buat Mabar
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((g) => {
              const { Icon: SportIcon, colorClass } = getSportVisual(g.sport_type);
              const priceNum = typeof g.price_per_person === "string" ? parseFloat(g.price_per_person) : g.price_per_person;
              const pct = Math.min(100, (g.current_players / g.max_players) * 100);
              return (
                <Link
                  key={g.id}
                  href={`/mabar/${g.id}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-400 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorClass}`}>
                      <SportIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SKILL_STYLE[g.skill_level] ?? SKILL_STYLE.all}`}>
                      {SKILL_LABEL[g.skill_level] ?? g.skill_level}
                    </span>
                  </div>
                  <h3 className="mb-2 line-clamp-1 font-bold text-slate-900 group-hover:text-blue-800">
                    {g.title}
                  </h3>
                  <div className="mb-3 space-y-1 text-xs text-slate-500">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {formatDate(g.scheduled_at)}
                      <Clock className="ml-2 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {formatTime(g.scheduled_at)}
                    </p>
                    {g.venue_name && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {g.venue_name}{g.court_name ? ` · ${g.court_name}` : ""}
                      </p>
                    )}
                    {g.host_name && (
                      <p className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        Host: {g.host_name}
                      </p>
                    )}
                  </div>
                  <div className="mb-2 flex items-center gap-2 text-xs text-slate-600">
                    <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="font-semibold">{g.current_players}/{g.max_players} pemain</span>
                  </div>
                  <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-800 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-sm font-bold text-orange-600">
                    {fmt(priceNum || 0)}<span className="font-normal text-slate-500">/orang</span>
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
