"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wallet, Users, Plus, X, ChevronRight, AlertCircle } from "lucide-react";

interface TeamWallet {
  id: string;
  name: string;
  sport_type: string | null;
  balance: string | number;
  member_count: number;
}

function formatIDR(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export default function WalletListPage() {
  const router = useRouter();
  const [wallets, setWallets] = useState<TeamWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    fetch("/api/team-wallets")
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        if (d.error) {
          setError(d.error);
          return;
        }
        const list = (d.data ?? d.wallets ?? []) as TeamWallet[];
        setWallets(Array.isArray(list) ? list : []);
      })
      .catch(() => setError("Gagal memuat data wallet"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/team-wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const d = await res.json();
      if (!res.ok) {
        setCreateError(d.error || "Gagal membuat wallet");
        return;
      }
      const created = (d.data ?? d) as TeamWallet;
      setShowCreate(false);
      setName("");
      router.push(`/profile/wallet/${created.id}`);
    } catch {
      setCreateError("Terjadi kesalahan jaringan");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-4 py-8">
          <div className="max-w-lg mx-auto">
            <div className="h-7 w-40 bg-white/20 rounded animate-pulse" />
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
              <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-7 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white px-4 py-8">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Team Wallet</h1>
            <p className="text-white/70 text-sm mt-1">Patungan booking bareng tim kamu</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            Buat Wallet
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {wallets.length === 0 && !error ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-primary-500" />
            </div>
            <h3 className="font-bold text-gray-800 mb-1">Belum ada wallet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Buat team wallet untuk patungan bayar booking bareng member tim kamu.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              Buat Wallet Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {wallets.map((w) => (
              <Link
                key={w.id}
                href={`/profile/wallet/${w.id}`}
                className="block bg-white rounded-2xl p-5 shadow-sm hover:shadow-card-hover transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shrink-0">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 truncate">{w.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{w.member_count ?? 1} member</span>
                    </div>
                    <p className="text-lg font-bold text-primary-600 mt-1">
                      {formatIDR(Number(w.balance) || 0)}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Buat Team Wallet</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                aria-label="Tutup"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nama Wallet
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="contoh: Futsal Jumat Berkah"
                maxLength={100}
                autoFocus
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {createError && (
                <p className="text-sm text-red-600 mt-2">{createError}</p>
              )}
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="w-full mt-4 bg-accent-600 hover:bg-accent-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition"
              >
                {creating ? "Membuat..." : "Buat Wallet"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
