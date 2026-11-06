"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSportVisual } from "@/lib/sport-icons";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Pencil,
  Trash2,
} from "lucide-react";

interface MyGame {
  id: string;
  title: string;
  sport_type: string;
  scheduled_at: string;
  duration_minutes: number;
  max_players: number;
  current_players: number;
  status: string;
  skill_level: string;
  venue_name?: string;
  host_customer_id?: string;
}

const fmt = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

export default function MabarSayaPage() {
  const router = useRouter();
  const [games, setGames] = useState<MyGame[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [gRes, sRes] = await Promise.all([
        fetch("/api/pickup-games/my"),
        fetch("/api/auth/session"),
      ]);
      if (gRes.status === 401 || gRes.status === 403) {
        router.push("/login");
        return;
      }
      if (!gRes.ok) throw new Error("Gagal memuat data");
      const gData = await gRes.json();
      const list = Array.isArray(gData) ? gData : (gData.data ?? gData.games ?? []);
      setGames(Array.isArray(list) ? list : []);

      if (sRes.ok) {
        const sData = await sRes.json();
        setMyId(sData?.user?.userId ?? null);
      }
    } catch {
      setError("Gagal memuat data mabar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [router]);

  const hosting = games.filter((g) => g.host_customer_id === myId);
  const joined = games.filter((g) => g.host_customer_id !== myId);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Batalkan "${title}"?`)) return;
    const r = await fetch(`/api/pickup-games/${id}`, { method: "DELETE" });
    if (r.ok) load();
    else alert("Gagal membatalkan");
  };

  const GameCard = ({ g, isHost }: { g: MyGame; isHost?: boolean }) => {
    const { Icon: SportIcon, colorClass } = getSportVisual(g.sport_type);
    const dt = new Date(g.scheduled_at);
    return (
      <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${g.status === "cancelled" ? "opacity-60" : ""}`}>
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
            <SportIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-900">{g.title}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                {dt.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {dt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {g.venue_name && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {g.venue_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" aria-hidden="true" />
                {g.current_players}/{g.max_players}
              </span>
            </div>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${g.status === "open" ? "bg-green-100 text-green-700" : g.status === "cancelled" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"}`}>
            {g.status === "open" ? "Terbuka" : g.status === "cancelled" ? "Dibatalkan" : g.status}
          </span>
        </div>
        {isHost && g.status === "open" && (
          <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
            <Link
              href={`/mabar/${g.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-200"
            >
              <Pencil className="h-3 w-3" aria-hidden="true" /> Detail
            </Link>
            <button
              onClick={() => handleDelete(g.id, g.title)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" /> Batalkan
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <Link href="/profile" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-blue-800">
          <ArrowLeft className="h-4 w-4" /> Profil
        </Link>

        <div className="mb-5">
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Mabar Saya</h1>
          <p className="mt-1 text-sm text-slate-500">Mabar yang kamu host dan ikuti</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : (
          <>
            {/* Hosting */}
            <section className="mb-6">
              <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
                Saya yang host
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                  {hosting.length}
                </span>
              </h2>
              {hosting.length === 0 ? (
                <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-slate-400">
                  Kamu belum host mabar apapun
                </p>
              ) : (
                <div className="space-y-3">
                  {hosting.map((g) => <GameCard key={g.id} g={g} isHost />)}
                </div>
              )}
            </section>

            {/* Joined */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
                Saya ikut
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                  {joined.length}
                </span>
              </h2>
              {joined.length === 0 ? (
                <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-slate-400">
                  Kamu belum join mabar apapun
                </p>
              ) : (
                <div className="space-y-3">
                  {joined.map((g) => <GameCard key={g.id} g={g} />)}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
