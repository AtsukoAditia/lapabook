"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSportVisual } from "@/lib/sport-icons";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  ArrowLeft,
  Trash2,
  Pencil,
  LogIn,
  LogOut,
  Crown,
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
  total_price: number | string;
  status: string;
  skill_level: string;
  description?: string;
  location_name?: string;
  venue_name?: string;
  court_name?: string;
  host_name?: string;
  host_customer_id?: string;
}

interface Participant {
  id: string;
  customer_id: string;
  customer_name?: string;
  is_host: boolean;
  joined_at?: string;
}

const SKILL_LABEL: Record<string, string> = {
  all: "Semua Level",
  beginner: "Pemula",
  intermediate: "Menengah",
  advanced: "Mahir",
};

const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID");

export default function MabarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [game, setGame] = useState<PickupGame | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsSupported, setParticipantsSupported] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [gRes, pRes, sRes] = await Promise.all([
        fetch(`/api/pickup-games/${id}`),
        fetch(`/api/pickup-games/${id}/participants`),
        fetch("/api/auth/session"),
      ]);

      if (!gRes.ok) {
        if (gRes.status === 404) setError("Mabar tidak ditemukan");
        else setError("Gagal memuat detail mabar");
        setLoading(false);
        return;
      }
      const gData = await gRes.json();
      setGame(gData.data ?? gData);

      if (pRes.ok) {
        const pData = await pRes.json();
        const list = Array.isArray(pData) ? pData : (pData.data ?? pData.participants ?? []);
        setParticipants(Array.isArray(list) ? list : []);
      } else {
        setParticipantsSupported(false);
      }

      if (sRes.ok) {
        const sData = await sRes.json();
        setMyId(sData?.user?.userId ?? null);
      }
    } catch {
      setError("Gagal memuat detail mabar");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const isHost = !!(game && myId && game.host_customer_id === myId);
  const isJoined = !!(myId && participants.some((p) => p.customer_id === myId));

  const handleJoin = async () => {
    if (!myId) { router.push("/login"); return; }
    setActionLoading(true);
    try {
      const r = await fetch(`/api/pickup-games/${id}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (r.ok) await loadAll();
      else {
        const d = await r.json().catch(() => ({}));
        alert(d.error || "Gagal join");
      }
    } finally { setActionLoading(false); }
  };

  const handleLeave = async () => {
    if (!confirm("Yakin mau keluar dari mabar ini?")) return;
    setActionLoading(true);
    try {
      const r = await fetch(`/api/pickup-games/${id}/leave`, { method: "DELETE" });
      if (r.ok) await loadAll();
      else {
        const d = await r.json().catch(() => ({}));
        alert(d.error || "Gagal keluar");
      }
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Batalkan mabar ini? Semua peserta akan diberitahu.")) return;
    setActionLoading(true);
    try {
      const r = await fetch(`/api/pickup-games/${id}`, { method: "DELETE" });
      if (r.ok) router.push("/mabar");
      else {
        const d = await r.json().catch(() => ({}));
        alert(d.error || "Gagal membatalkan");
      }
    } finally { setActionLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="mb-4 h-6 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-64 animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-lg font-semibold text-slate-700">{error || "Mabar tidak ditemukan"}</p>
          <Link href="/mabar" className="mt-4 inline-block text-blue-800 hover:underline">
            Kembali ke daftar mabar
          </Link>
        </div>
      </div>
    );
  }

  const { Icon: SportIcon, colorClass } = getSportVisual(game.sport_type);
  const priceNum = typeof game.price_per_person === "string" ? parseFloat(game.price_per_person) : game.price_per_person;
  const totalNum = typeof game.total_price === "string" ? parseFloat(game.total_price) : game.total_price;
  const pct = Math.min(100, (game.current_players / game.max_players) * 100);
  const isFull = game.current_players >= game.max_players;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <Link
          href="/mabar"
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali
        </Link>

        {/* Header card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
              <SportIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black text-slate-900 sm:text-2xl">{game.title}</h1>
              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-800">
                  {SKILL_LABEL[game.skill_level] ?? game.skill_level}
                </span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${game.status === "open" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                  {game.status === "open" ? "Terbuka" : game.status}
                </span>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500">Tanggal</p>
                <p className="font-semibold">
                  {new Date(game.scheduled_at).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500">Jam</p>
                <p className="font-semibold">
                  {new Date(game.scheduled_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} ({game.duration_minutes} menit)
                </p>
              </div>
            </div>
            {game.venue_name && (
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <div>
                  <p className="text-xs text-slate-500">Lokasi</p>
                  <p className="font-semibold">{game.venue_name}{game.court_name ? ` · ${game.court_name}` : ""}</p>
                </div>
              </div>
            )}
            {game.host_name && (
              <div className="flex items-center gap-2 text-slate-700">
                <User className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <div>
                  <p className="text-xs text-slate-500">Host</p>
                  <p className="font-semibold">{game.host_name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Cost */}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-lg font-bold text-orange-600">{fmt(priceNum || 0)}<span className="text-sm font-normal text-slate-500">/orang</span></span>
            <span className="text-sm text-slate-400">Total {fmt(totalNum || 0)}</span>
          </div>

          {/* Slot */}
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Users className="h-4 w-4" aria-hidden="true" />
                {game.current_players}/{game.max_players} pemain
              </span>
              <span className="text-xs text-slate-500">{isFull ? "Penuh" : `${game.max_players - game.current_players} slot tersisa`}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-800" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Description */}
          {game.description && (
            <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
              {game.description}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap gap-2">
            {!isHost && (
              <>
                {!isJoined && !isFull && game.status === "open" && (
                  <button
                    onClick={handleJoin}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
                  >
                    <LogIn className="h-4 w-4" aria-hidden="true" /> Gabung Mabar
                  </button>
                )}
                {!isJoined && !myId && game.status === "open" && (
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-500"
                  >
                    <LogIn className="h-4 w-4" aria-hidden="true" /> Masuk untuk Gabung
                  </Link>
                )}
                {isJoined && (
                  <button
                    onClick={handleLeave}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" /> Keluar
                  </button>
                )}
              </>
            )}
            {isHost && (
              <>
                <button
                  onClick={() => router.push(`/mabar/${id}?edit=1`)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Batalkan
                </button>
              </>
            )}
          </div>
        </div>

        {/* Participants */}
        {participantsSupported && participants.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-slate-900">Peserta ({participants.length})</h2>
            <ul className="divide-y divide-slate-100">
              {participants.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
                    {(p.customer_name || "P").charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium text-slate-700">
                    {p.customer_name || "Peserta"}
                  </span>
                  {p.is_host && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      <Crown className="h-3 w-3" aria-hidden="true" /> Host
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {!participantsSupported && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
            <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" aria-hidden="true" />
            {game.current_players}/{game.max_players} pemain sudah join
          </div>
        )}
      </div>
    </div>
  );
}
