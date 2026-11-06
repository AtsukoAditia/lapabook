"use client";

import { useEffect, useState } from "react";
import { Handshake, Check, ClipboardList, Copy, Target, Link as LinkIcon, BarChart3, Users, CheckCircle2, XCircle, Clock } from "lucide-react";

interface ReferralData {
  referralCode: string | null;
  referrals: { id: string; referral_code: string; status: string; points_awarded: number; referee_name: string | null; created_at: string; completed_at: string | null }[];
  transactions: { id: string; points: number; type: string; description: string; created_at: string }[];
  stats: { completedReferrals: number; totalPointsEarned: number; currentBalance: number; totalSpent: number };
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const s = await fetch("/api/auth/session", { cache: "no-store" });
        const sj = await s.json().catch(() => ({}));
        const uid = sj?.user?.userId ?? null;
        if (cancelled) return;
        if (!uid) {
          setAuthError("Login dulu untuk pakai referral.");
          setLoading(false);
          return;
        }
        setCustomerId(uid);
        const r = await fetch(`/api/referrals?customerId=${uid}`, { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        // guard: API may return error shape
        if (j?.error) {
          setData({ referralCode: null, referrals: [], transactions: [], stats: { completedReferrals: 0, totalPointsEarned: 0, currentBalance: 0, totalSpent: 0 } });
        } else {
          setData({
            referralCode: j.referralCode ?? null,
            referrals: Array.isArray(j.referrals) ? j.referrals : [],
            transactions: Array.isArray(j.transactions) ? j.transactions : [],
            stats: j.stats ?? { completedReferrals: 0, totalPointsEarned: 0, currentBalance: 0, totalSpent: 0 },
          });
        }
      } catch {
        if (!cancelled) setData({ referralCode: null, referrals: [], transactions: [], stats: { completedReferrals: 0, totalPointsEarned: 0, currentBalance: 0, totalSpent: 0 } });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function generateCode() {
    if (!customerId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.referralCode) {
        setData((prev) => prev ? { ...prev, referralCode: d.referralCode } : { referralCode: d.referralCode, referrals: [], transactions: [], stats: { completedReferrals: 0, totalPointsEarned: 0, currentBalance: 0, totalSpent: 0 } });
      } else if (d.error) {
        setApplyResult(d.error || "");
      }
    } catch {}
    setGenerating(false);
  }

  async function applyReferral() {
    if (!applyCode.trim() || !customerId) return;
    setApplying(true);
    setApplyResult("");
    try {
      const res = await fetch("/api/referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: applyCode.trim(), refereeId: customerId }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setApplyResult(`Berhasil! Kamu dapat ${d.refereePoints} poin`);
        // refresh data
        const r = await fetch(`/api/referrals?customerId=${customerId}`, { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (j && !j.error) setData({ referralCode: j.referralCode ?? null, referrals: j.referrals ?? [], transactions: j.transactions ?? [], stats: j.stats ?? { completedReferrals: 0, totalPointsEarned: 0, currentBalance: 0, totalSpent: 0 } });
      } else {
        setApplyResult(d.error ?? "Gagal");
      }
    } catch {
      setApplyResult("Gagal menggunakan kode referral");
    }
    setApplying(false);
  }

  function copyCode() {
    if (data?.referralCode) {
      navigator.clipboard.writeText(data.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="page-enter min-h-screen bg-slate-50">
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 py-8 text-center">
          <Handshake className="mx-auto mb-2 h-10 w-10 text-white" aria-hidden={true} />
          <h1 className="text-2xl font-black text-white">Referral & Rewards</h1>
        </div>
        <div className="mx-auto max-w-lg px-4 py-10 text-center">
          <p className="text-sm text-slate-600">{authError}</p>
          <a href="/login" className="mt-4 inline-block rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white">Masuk</a>
        </div>
      </div>
    );
  }

  const TIER_LABELS: Record<string, string> = {
    earned: "Earned",
    redeemed: "Redeemed",
    bonus: "Bonus",
    expired: "Expired",
    adjusted: "Adjusted",
  };

  return (
    <div className="page-enter page-enter-slide-up min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 py-8 text-center">
        <Handshake className="mx-auto mb-2 h-10 w-10 text-white" aria-hidden={true} />
        <h1 className="text-2xl font-black text-white">Referral & Rewards</h1>
        <p className="text-emerald-100 text-sm mt-1">Ajak teman, dapatkan poin!</p>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Referral Code Card */}
        <div className="mb-6 rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-lg text-center">
          {data?.referralCode ? (
            <>
              <p className="text-xs text-gray-500 mb-2">Kode Referral Kamu</p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-3xl font-extrabold tracking-widest text-emerald-700">{data.referralCode}</p>
                <button
                  onClick={copyCode}
                  className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-200 transition"
                >
                  {copied ? <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" aria-hidden={true} /> Copied!</span> : <span className="inline-flex items-center gap-1"><Copy className="h-3 w-3" aria-hidden={true} /> Copy</span>}
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Bagikan kode ini ke teman. Kamu dapat <strong>50.000 poin</strong>, teman dapat <strong>25.000 poin</strong>!
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-3">Kamu belum punya kode referral</p>
              <button
                onClick={generateCode}
                disabled={generating}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
              >
                {generating ? "Membuat..." : <span className="inline-flex items-center gap-1.5"><Target className="h-4 w-4" aria-hidden={true} /> Buat Kode Referral</span>}
              </button>
            </>
          )}
        </div>

        {/* Apply Referral Code */}
        <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 mb-3"><LinkIcon className="h-4 w-4" aria-hidden={true} /> Punya Kode Referral?</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={applyCode}
              onChange={(e) => setApplyCode(e.target.value)}
              placeholder="Masukkan kode referral"
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
            <button
              onClick={applyReferral}
              disabled={applying || !applyCode.trim()}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {applying ? "..." : "Pakai"}
            </button>
          </div>
          {applyResult && <p className="mt-2 text-sm">{applyResult}</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl bg-white border p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{(data?.stats?.completedReferrals ?? 0)}</p>
            <p className="text-xs text-gray-500">Teman Diundang</p>
          </div>
          <div className="rounded-xl bg-white border p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{(data?.stats?.totalPointsEarned ?? 0).toLocaleString("id-ID")}</p>
            <p className="text-xs text-gray-500">Poin dari Referral</p>
          </div>
          <div className="rounded-xl bg-white border p-4 text-center">
            <p className="text-2xl font-bold text-primary-500">{(data?.stats?.currentBalance ?? 0).toLocaleString("id-ID")}</p>
            <p className="text-xs text-gray-500">Poin Saat Ini</p>
          </div>
          <div className="rounded-xl bg-white border p-4 text-center">
            <p className="text-2xl font-bold text-primary-500">Rp {(data?.stats?.totalSpent ?? 0).toLocaleString("id-ID")}</p>
            <p className="text-xs text-gray-500">Total Transaksi</p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="mb-6">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 mb-3"><BarChart3 className="h-4 w-4" aria-hidden={true} /> Riwayat Poin</h2>
          {data?.transactions && data.transactions.length > 0 ? (
            <div className="space-y-2">
              {data.transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-white border">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{TIER_LABELS[tx.type] || tx.type}</p>
                    <p className="text-xs text-gray-500">{tx.description}</p>
                    <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleDateString("id-ID")}</p>
                  </div>
                  <p className={`text-sm font-bold ${tx.points >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {tx.points >= 0 ? "+" : ""}{tx.points.toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500 py-6">Belum ada transaksi poin</p>
          )}
        </div>

        {/* Referral History */}
        {data?.referrals && data.referrals.length > 0 && (
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 mb-3"><Users className="h-4 w-4" aria-hidden={true} /> Riwayat Referral</h2>
            <div className="space-y-2">
              {data.referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-3 rounded-xl bg-white border">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ref.referee_name || "Menunggu..."}</p>
                    <p className="text-xs text-gray-500">Kode: {ref.referral_code}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      ref.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                      ref.status === "pending" ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                    <span className="inline-flex items-center gap-1">
                      {ref.status === "completed"
                        ? <><CheckCircle2 className="h-3 w-3" aria-hidden={true} /> Selesai</>
                        : ref.status === "pending"
                        ? <><Clock className="h-3 w-3" aria-hidden={true} /> Menunggu</>
                        : <><XCircle className="h-3 w-3" aria-hidden={true} /> Expired</>}
                    </span>
                    </span>
                    {ref.points_awarded > 0 && (
                      <p className="text-xs text-emerald-600 mt-1">+{ref.points_awarded.toLocaleString("id-ID")} poin</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
