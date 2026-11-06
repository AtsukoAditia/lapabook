"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSportVisual } from "@/lib/sport-icons";
import {
  Search,
  MapPin,
  SearchX,
  Star,
} from "lucide-react";

interface CourtResult {
  courtId: string;
  courtName: string;
  courtSlug: string;
  sportSlug: string;
  minPrice: number;
  venueId: string;
  venueName: string;
  venueSlug: string;
  areaCity: string;
  avgRating: number;
  reviewCount: number;
}

const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID");

export default function CariPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <CariContent />
    </Suspense>
  );
}

function CariContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const [courts, setCourts] = useState<CourtResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [sports, setSports] = useState<Array<{ slug: string; name: string }>>([]);
  const [sport, setSport] = useState(sp.get("sport") || "");
  const [search, setSearch] = useState(sp.get("q") || "");
  const [areaId, setAreaId] = useState(sp.get("areaId") || "");
  const [areas, setAreas] = useState<Array<{ id: string; label: string }>>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch("/api/areas")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.areas ?? d.data ?? []);
        setAreas(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
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
    const params = new URLSearchParams();
    if (sport) params.set("sport", sport);
    if (search) params.set("q", search);
    if (areaId) params.set("areaId", areaId);
    params.set("page", String(page));
    params.set("limit", "12");
    params.set("sort", "name");

    fetch(`/api/search/courts?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        setCourts(d.courts || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
      })
      .catch(() => { setCourts([]); setTotal(0); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [sport, search, areaId, page]);

  const updateUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (sport) p.set("sport", sport);
    if (search) p.set("q", search);
    if (areaId) p.set("areaId", areaId);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    router.replace(`/cari${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [sport, search, areaId, page, router]);

  useEffect(() => {
    const t = setTimeout(updateUrl, 300);
    return () => clearTimeout(t);
  }, [updateUrl]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 px-4 pb-8 pt-10 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <nav className="mb-3 text-xs text-blue-200">
            <Link href="/" className="hover:text-white">Beranda</Link>
            <span> / Cari Lapangan</span>
          </nav>
          <h1 className="text-2xl font-black sm:text-3xl">Cari Lapangan Olahraga</h1>
          <p className="text-blue-200">Semua venue & olahraga di satu tempat</p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Filter Bar */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Cari nama lapangan / venue..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              aria-label="Cari lapangan"
            />
          </div>
          <select
            value={sport}
            onChange={(e) => { setSport(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            aria-label="Filter olahraga"
          >
            <option value="">Semua Olahraga</option>
            {sports.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
          <select
            value={areaId}
            onChange={(e) => { setAreaId(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            aria-label="Filter lokasi"
          >
            <option value="">Semua Lokasi</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
          <button
            onClick={() => { setSport(""); setSearch(""); setAreaId(""); setPage(1); }}
            className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 transition"
          >
            Reset Filter
          </button>
        </div>

        {/* Results */}
        <div className="mb-4 text-sm text-slate-500">
          {loading ? "Memuat..." : `${total} lapangan ditemukan`}
        </div>

        {!loading && courts.length === 0 ? (
          <div className="py-20 text-center">
            <SearchX className="mx-auto mb-3 h-14 w-14 text-slate-300" aria-hidden="true" />
            <p className="font-medium text-slate-500">Tidak ada lapangan ditemukan</p>
            <p className="mt-1 text-sm text-slate-400">Coba ubah filter atau reset pencarian</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courts.map((court) => {
              const { Icon: SportIcon } = getSportVisual(court.sportSlug);
              return (
                <Link
                  key={court.courtId}
                  href={`/cari/${court.sportSlug}/${court.courtId}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-400 hover:shadow-md"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <SportIcon className="h-10 w-10 text-blue-800 opacity-70" aria-hidden="true" />
                    {court.avgRating > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                        {court.avgRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <h3 className="mb-1 font-bold text-slate-900 group-hover:text-blue-800">
                    {court.courtName}
                  </h3>
                  <p className="mb-1 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {court.venueName} · {court.areaCity}
                  </p>
                  <p className="text-sm font-bold text-blue-700">{fmt(court.minPrice)}/jam</p>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-50 transition"
            >
              ← Sebelumnya
            </button>
            <span className="text-sm text-slate-600">Halaman {page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-50 transition"
            >
              Berikutnya →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
