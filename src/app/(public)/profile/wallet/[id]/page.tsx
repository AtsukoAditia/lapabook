"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Banknote,
  Receipt,
  Scissors,
  Plus,
  Trash2,
  AlertCircle,
  Crown,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

/* ---------- Types (match API rows) ---------- */

interface WalletMember {
  id: string;
  customer_id: string;
  role: string;
  joined_at: string;
  customer_name: string | null;
  customer_email?: string | null;
}

interface WalletDetail {
  id: string;
  name: string;
  balance: string | number;
  member_count: number;
  owner_customer_id: string;
  owner_name: string | null;
  members: WalletMember[];
}

interface Deposit {
  id: string;
  amount: string | number;
  payment_method: string | null;
  status: string;
  notes: string | null;
  from_customer_name: string | null;
  created_at: string;
}

interface Tx {
  id: string;
  type: string;
  amount: string | number;
  description: string | null;
  reference_id: string | null;
  customer_name: string | null;
  created_at: string;
}

interface PlayerResult {
  id: string;
  name: string;
  preferred_sport: string | null;
}

interface SplitMember {
  customerId: string;
  customerName: string | null;
  amount: string | number;
  status: string;
  paidAt: string | null;
}

interface Split {
  id: string;
  totalAmount: string | number;
  splitType: string;
  status: string;
  createdAt: string;
  bookingId: string | null;
  members: SplitMember[];
}

type Tab = "members" | "deposits" | "transactions" | "split";

/* ---------- Helpers ---------- */

function formatIDR(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DEPOSIT_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Menunggu Verifikasi", cls: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Dikonfirmasi", cls: "bg-green-100 text-green-700" },
  approved: { label: "Dikonfirmasi", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
};

const SPLIT_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Selesai", cls: "bg-green-100 text-green-700" },
};

/* ---------- Page ---------- */

export default function WalletDetailPage() {
  const params = useParams<{ id: string }>();
  const walletId = params.id;
  const router = useRouter();

  const [wallet, setWallet] = useState<WalletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("members");
  const [toast, setToast] = useState("");
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    const res = await fetch(`/api/team-wallets/${walletId}`);
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Gagal memuat wallet");
      return;
    }
    setWallet((d.data ?? d) as WalletDetail);
  }, [walletId, router]);

  useEffect(() => {
    // Auth check (detail GET is open, mutations are not)
    fetch("/api/auth/session")
      .then((r) => {
        if (!r.ok) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d?.user?.userId) router.push("/login");
        else setSessionUserId(d.user.userId as string);
      })
      .catch(() => {});
    loadWallet()
      .catch(() => setError("Gagal memuat wallet"))
      .finally(() => setLoading(false));
  }, [loadWallet, router]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-4 pt-6 pb-16 animate-pulse">
          <div className="max-w-lg mx-auto">
            <div className="h-4 w-24 bg-white/20 rounded mb-6" />
            <div className="h-6 w-40 bg-white/20 rounded mb-2" />
            <div className="h-10 w-32 bg-white/20 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm max-w-sm w-full">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">{error || "Wallet tidak ditemukan"}</p>
          <Link href="/profile/wallet" className="inline-block mt-4 text-primary-600 text-sm font-semibold hover:underline">
            Kembali ke daftar wallet
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "members", label: "Member", icon: <Users className="w-4 h-4" /> },
    { key: "deposits", label: "Top Up", icon: <Banknote className="w-4 h-4" /> },
    { key: "transactions", label: "Riwayat", icon: <Receipt className="w-4 h-4" /> },
    { key: "split", label: "Split Bill", icon: <Scissors className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white px-4 pt-6 pb-16">
        <div className="max-w-lg mx-auto">
          <Link href="/profile/wallet" className="inline-flex items-center gap-1 text-white/70 text-sm hover:text-white transition mb-6">
            <ArrowLeft className="w-4 h-4" />
            Semua Wallet
          </Link>
          <h1 className="text-xl font-bold">{wallet.name}</h1>
          <p className="text-white/60 text-xs mt-0.5">Owner: {wallet.owner_name ?? "-"}</p>
          <p className="text-4xl font-bold mt-3">{formatIDR(Number(wallet.balance) || 0)}</p>
          <p className="text-white/70 text-sm mt-1">Saldo tersedia</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg flex overflow-hidden">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs font-medium transition ${
                tab === t.key
                  ? "text-primary-600 border-b-2 border-primary-500 bg-primary-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4">
        {tab === "members" && (
          <MembersTab wallet={wallet} onChanged={loadWallet} showToast={showToast} />
        )}
        {tab === "deposits" && (
          <DepositsTab
            walletId={wallet.id}
            isOwner={sessionUserId !== null && wallet.owner_customer_id === sessionUserId}
            onChanged={loadWallet}
            showToast={showToast}
          />
        )}
        {tab === "transactions" && <TransactionsTab walletId={wallet.id} />}
        {tab === "split" && (
          <SplitTab
            wallet={wallet}
            isOwner={sessionUserId !== null && wallet.owner_customer_id === sessionUserId}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Members Tab ---------- */

function MembersTab({
  wallet,
  onChanged,
  showToast,
}: {
  wallet: WalletDetail;
  onChanged: () => Promise<void>;
  showToast: (m: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  // Player search: /api/players returns public player profiles (id + name)
  useEffect(() => {
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch("/api/players");
        const d = await res.json();
        const list = (d.data ?? []) as PlayerResult[];
        const q = query.trim().toLowerCase();
        setResults(
          (Array.isArray(list) ? list : [])
            .filter((p) => !q || p.name?.toLowerCase().includes(q))
            .slice(0, 6),
        );
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function addMember(customerId: string) {
    setAdding(customerId);
    setFormError("");
    try {
      const res = await fetch(`/api/team-wallets/${wallet.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const d = await res.json();
      if (!res.ok) {
        setFormError(d.error || "Gagal menambahkan member");
        return;
      }
      setQuery("");
      showToast("Member ditambahkan");
      await onChanged();
    } catch {
      setFormError("Terjadi kesalahan jaringan");
    } finally {
      setAdding(null);
    }
  }

  async function removeMember(customerId: string) {
    if (!confirm("Hapus member ini dari wallet?")) return;
    setRemoving(customerId);
    try {
      const res = await fetch(`/api/team-wallets/${wallet.id}/members/${customerId}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) {
        showToast(d.error || "Gagal hapus member");
        return;
      }
      showToast("Member dihapus");
      await onChanged();
    } catch {
      showToast("Terjadi kesalahan jaringan");
    } finally {
      setRemoving(null);
    }
  }

  const memberIds = new Set((wallet.members ?? []).map((m) => m.customer_id));

  return (
    <div className="space-y-4">
      {/* Add member */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary-500" />
          Tambah Member
        </h3>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama player..."
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {formError && <p className="text-sm text-red-600 mt-2">{formError}</p>}
        <div className="mt-2 divide-y divide-gray-100">
          {searching && <p className="text-xs text-gray-400 py-2">Mencari...</p>}
          {!searching &&
            results.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  {p.preferred_sport && <p className="text-xs text-gray-400">{p.preferred_sport}</p>}
                </div>
                {memberIds.has(p.id) ? (
                  <span className="text-xs text-gray-400 shrink-0">Sudah member</span>
                ) : (
                  <button
                    onClick={() => addMember(p.id)}
                    disabled={adding === p.id}
                    className="text-xs font-semibold bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white px-3 py-1.5 rounded-lg transition shrink-0"
                  >
                    {adding === p.id ? "..." : "Tambah"}
                  </button>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Member list */}
      <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
        {(wallet.members ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Belum ada member</p>
        ) : (
          (wallet.members ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary-600">
                  {(m.customer_name ?? "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate flex items-center gap-1.5">
                  {m.customer_name ?? "Member"}
                  {m.role === "owner" && <Crown className="w-3.5 h-3.5 text-accent-500" />}
                </p>
                <p className="text-xs text-gray-400 capitalize">{m.role}</p>
              </div>
              {m.role !== "owner" && (
                <button
                  onClick={() => removeMember(m.customer_id)}
                  disabled={removing === m.customer_id}
                  className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-40"
                  aria-label="Hapus member"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------- Deposits Tab ---------- */

function DepositsTab({
  walletId,
  isOwner,
  onChanged,
  showToast,
}: {
  walletId: string;
  isOwner: boolean;
  onChanged: () => Promise<void>;
  showToast: (m: string) => void;
}) {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/team-wallets/${walletId}/deposits`);
    const d = await res.json();
    const list = (d.data ?? d.deposits ?? []) as Deposit[];
    setDeposits(Array.isArray(list) ? list : []);
  }, [walletId]);

  useEffect(() => {
    load().catch(() => {}).finally(() => setLoading(false));
  }, [load]);

  async function confirmDeposit(depositId: string) {
    setConfirming(depositId);
    try {
      const res = await fetch(`/api/team-wallets/${walletId}/deposits/${depositId}/confirm`, {
        method: "POST",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(d.error || "Gagal konfirmasi deposit");
        return;
      }
      showToast("Deposit dikonfirmasi");
      await Promise.all([load(), onChanged()]);
    } catch {
      showToast("Terjadi kesalahan jaringan");
    } finally {
      setConfirming(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseInt(amount.replace(/\D/g, ""), 10);
    if (!amt || amt <= 0) {
      setFormError("Masukkan jumlah yang valid");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch(`/api/team-wallets/${walletId}/deposits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, paymentMethod: "manual_transfer", notes: notes.trim() || undefined }),
      });
      const d = await res.json();
      if (!res.ok) {
        setFormError(d.error || "Gagal membuat deposit");
        return;
      }
      setAmount("");
      setNotes("");
      showToast("Deposit dibuat — menunggu verifikasi admin");
      await load();
    } catch {
      setFormError("Terjadi kesalahan jaringan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Topup form */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-primary-500" />
          Top Up Saldo
        </h3>
        <form onSubmit={submit}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Jumlah (Rp)</label>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, "."))}
            placeholder="contoh: 100.000"
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <label className="block text-sm font-medium text-gray-700 mt-3 mb-1.5">Catatan (opsional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="contoh: transfer BCA a.n. Budi"
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {formError && <p className="text-sm text-red-600 mt-2">{formError}</p>}
          <button
            type="submit"
            disabled={submitting || !amount.trim()}
            className="w-full mt-4 bg-accent-600 hover:bg-accent-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition"
          >
            {submitting ? "Memproses..." : "Buat Deposit"}
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Metode: transfer manual. Deposit berstatus pending sampai diverifikasi admin.
          </p>
        </form>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm">
        <h3 className="font-bold text-gray-800 px-5 pt-4 pb-2">Riwayat Deposit</h3>
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse flex justify-between">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-4 w-20 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : deposits.length === 0 ? (
          <p className="text-sm text-gray-500 text-center pb-6">Belum ada deposit</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {deposits.map((d) => {
              const st = DEPOSIT_STATUS[d.status] ?? { label: d.status, cls: "bg-gray-100 text-gray-700" };
              return (
                <div key={d.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{formatIDR(Number(d.amount) || 0)}</p>
                    <p className="text-xs text-gray-400">
                      {d.from_customer_name ?? "Member"} • {formatDate(d.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                    {isOwner && d.status === "pending" && (
                      <button
                        onClick={() => confirmDeposit(d.id)}
                        disabled={confirming !== null}
                        className="text-xs font-semibold bg-accent-600 hover:bg-accent-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition"
                      >
                        {confirming === d.id ? "Memproses..." : "Konfirmasi"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Transactions Tab ---------- */

function TransactionsTab({ walletId }: { walletId: string }) {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/team-wallets/${walletId}/transactions`)
      .then((r) => r.json())
      .then((d) => {
        const list = (d.data ?? d.transactions ?? []) as Tx[];
        setTxs(Array.isArray(list) ? list : []);
      })
      .catch(() => setError("Gagal memuat riwayat"))
      .finally(() => setLoading(false));
  }, [walletId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex justify-between">
            <div className="h-4 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (txs.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Belum ada transaksi</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
      {txs.map((t) => {
        const negative = t.type === "booking_payment" || Number(t.amount) < 0;
        return (
          <div key={t.id} className="flex items-center justify-between p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{t.description ?? t.type}</p>
              <p className="text-xs text-gray-400">
                {t.customer_name ?? "-"} • {formatDate(t.created_at)}
              </p>
            </div>
            <span className={`text-sm font-bold shrink-0 ${negative ? "text-red-500" : "text-green-600"}`}>
              {negative ? "-" : "+"}
              {formatIDR(Math.abs(Number(t.amount) || 0))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Split Tab ---------- */

function SplitTab({
  wallet,
  isOwner,
  showToast,
}: {
  wallet: WalletDetail;
  isOwner: boolean;
  showToast: (m: string) => void;
}) {
  const members = useMemo(() => wallet.members ?? [], [wallet.members]);
  const [bookingId, setBookingId] = useState("");
  const [total, setTotal] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [splits, setSplits] = useState<Split[]>([]);
  const [splitsLoading, setSplitsLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  async function markPaid(splitId: string, customerId: string) {
    const key = `${splitId}:${customerId}`;
    setMarking(key);
    try {
      const res = await fetch(`/api/team-wallets/${wallet.id}/splits/${splitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_paid", customerId }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409) {
        showToast("Sudah lunas");
        await loadSplits();
        return;
      }
      if (!res.ok) {
        showToast(d.error || "Gagal menandai lunas");
        return;
      }
      showToast("Ditandai lunas");
      await loadSplits();
    } catch {
      showToast("Terjadi kesalahan jaringan");
    } finally {
      setMarking(null);
    }
  }

  const loadSplits = useCallback(async () => {
    const res = await fetch(`/api/team-wallets/${wallet.id}/splits`);
    const d = await res.json();
    const list = (Array.isArray(d) ? d : (d.data ?? [])) as Split[];
    setSplits(Array.isArray(list) ? list : []);
  }, [wallet.id]);

  useEffect(() => {
    loadSplits().catch(() => {}).finally(() => setSplitsLoading(false));
  }, [loadSplits]);

  const totalNum = parseInt(total.replace(/\D/g, ""), 10) || 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const equalShare = selected.size > 0 && totalNum > 0 ? Math.floor(totalNum / selected.size) : 0;

  const customSum = [...selected].reduce(
    (sum, id) => sum + (parseInt((customAmounts[id] ?? "").replace(/\D/g, ""), 10) || 0),
    0,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!totalNum || selected.size === 0) {
      setFormError("Isi total dan pilih minimal 1 member");
      return;
    }
    let splitMembers: { customerId: string; amount: number }[];
    if (splitType === "equal") {
      // First members get remainder so amounts sum exactly to total
      const rest = totalNum - equalShare * selected.size;
      splitMembers = [...selected].map((id, i) => ({
        customerId: id,
        amount: equalShare + (i < rest ? 1 : 0),
      }));
    } else {
      if (customSum !== totalNum) {
        setFormError(`Total pembagian (${formatIDR(customSum)}) harus sama dengan total tagihan (${formatIDR(totalNum)})`);
        return;
      }
      splitMembers = [...selected].map((id) => ({
        customerId: id,
        amount: parseInt((customAmounts[id] ?? "").replace(/\D/g, ""), 10) || 0,
      }));
    }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch(`/api/team-wallets/${wallet.id}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingId.trim() || undefined,
          totalAmount: totalNum,
          splitType,
          members: splitMembers,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setFormError(d.error || "Gagal membuat split bill");
        return;
      }
      showToast("Split bill berhasil dibuat");
      setBookingId("");
      setTotal("");
      setSelected(new Set());
      setCustomAmounts({});
      await loadSplits();
    } catch {
      setFormError("Terjadi kesalahan jaringan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
        <Scissors className="w-4 h-4 text-primary-500" />
        Buat Split Bill
      </h3>
      <form onSubmit={submit}>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Booking ID <span className="text-gray-400 font-normal">(opsional)</span>
        </label>
        <input
          type="text"
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          placeholder="Tempel booking ID/kode"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <label className="block text-sm font-medium text-gray-700 mt-3 mb-1.5">Total Tagihan (Rp)</label>
        <input
          type="text"
          inputMode="numeric"
          value={total}
          onChange={(e) => setTotal(e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, "."))}
          placeholder="contoh: 300.000"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />

        {/* Split type */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          {(
            [
              { key: "equal", label: "Rata (equal)" },
              { key: "custom", label: "Custom" },
            ] as const
          ).map((opt) => (
            <button
              type="button"
              key={opt.key}
              onClick={() => setSplitType(opt.key)}
              className={`py-2 rounded-xl text-sm font-medium border transition ${
                splitType === opt.key
                  ? "border-primary-500 bg-primary-50 text-primary-600"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Members */}
        <p className="text-sm font-medium text-gray-700 mt-4 mb-2">Pilih member yang ikut patungan</p>
        {members.length === 0 ? (
          <p className="text-xs text-gray-400">Belum ada member di wallet ini.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const isOn = selected.has(m.customer_id);
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(m.customer_id)}
                    className={`flex-1 flex items-center justify-between border rounded-xl px-3.5 py-2.5 text-sm transition ${
                      isOn ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className="font-medium text-gray-800 truncate">{m.customer_name ?? "Member"}</span>
                    {isOn && splitType === "equal" && equalShare > 0 ? (
                      <span className="text-xs font-semibold text-primary-600 shrink-0">{formatIDR(equalShare)}</span>
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />
                    )}
                  </button>
                  {isOn && splitType === "custom" && (
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customAmounts[m.customer_id] ?? ""}
                      onChange={(e) =>
                        setCustomAmounts((prev) => ({
                          ...prev,
                          [m.customer_id]: e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, "."),
                        }))
                      }
                      placeholder="0"
                      className="w-28 border border-gray-300 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {splitType === "custom" && selected.size > 0 && totalNum > 0 && (
          <p className={`text-xs mt-2 ${customSum === totalNum ? "text-green-600" : "text-gray-400"}`}>
            Total pembagian: {formatIDR(customSum)} / {formatIDR(totalNum)}
          </p>
        )}

        {formError && <p className="text-sm text-red-600 mt-3">{formError}</p>}
        <button
          type="submit"
          disabled={submitting || !totalNum || selected.size === 0}
          className="w-full mt-4 bg-accent-600 hover:bg-accent-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition"
        >
          {submitting ? "Memproses..." : "Buat Split Bill"}
        </button>
      </form>
      </div>

      {/* Existing splits */}
      <div className="bg-white rounded-2xl shadow-sm">
        <h3 className="font-bold text-gray-800 px-5 pt-4 pb-2">Daftar Split Bill</h3>
        {splitsLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse flex justify-between">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-4 w-20 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : splits.length === 0 ? (
          <p className="text-sm text-gray-500 text-center pb-6">Belum ada split bill</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {splits.map((s) => {
              const st = SPLIT_STATUS[s.status] ?? { label: s.status, cls: "bg-gray-100 text-gray-700" };
              return (
                <div key={s.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {formatIDR(Number(s.totalAmount) || 0)}
                        <span className="text-xs font-normal text-gray-400"> • {s.splitType === "equal" ? "Rata" : "Custom"}</span>
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(s.createdAt)}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(s.members ?? []).map((m) => (
                      <div key={m.customerId} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700 truncate">{m.customerName ?? "Member"}</p>
                          {m.status === "paid" && m.paidAt && (
                            <p className="text-xs text-gray-400">Lunas {formatDate(m.paidAt)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-medium text-gray-800">{formatIDR(Number(m.amount) || 0)}</span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              m.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {m.status === "paid" ? "Lunas" : "Pending"}
                          </span>
                          {isOwner && m.status === "pending" && (
                            <button
                              onClick={() => markPaid(s.id, m.customerId)}
                              disabled={marking !== null}
                              className="text-xs font-semibold bg-accent-600 hover:bg-accent-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition"
                            >
                              {marking === `${s.id}:${m.customerId}` ? "Memproses..." : "Tandai Lunas"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
