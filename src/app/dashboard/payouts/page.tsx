"use client";

import { useEffect, useState } from "react";
import { Wallet, Send } from "lucide-react";

interface Payout {
  id: string; venueId: string | null; amount: number;
  status: string; note: string; requestedAt: string; decidedAt: string | null;
}

interface Balance { earned: number; settled: number; pending: number; available: number; }

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default function OwnerPayoutsPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchData = () => {
    fetch("/api/owner/payouts")
      .then((r) => r.json())
      .then((d) => { if (d.balance) setBalance(d.balance); if (d.payouts) setPayouts(d.payouts); })
      .catch(() => {});
  };
  useEffect(() => { fetchData(); }, []);

  const submit = async () => {
    setSubmitting(true); setMsg("");
    try {
      const res = await fetch("/api/owner/payouts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Gagal");
      setAmount(""); setMsg("Pengajuan terkirim.");
      fetchData();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal mengajukan");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-gray-900">Penarikan Dana</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Diterima", value: balance?.earned ?? 0 },
          { label: "Tersedia", value: balance?.available ?? 0 },
          { label: "Menunggu", value: balance?.pending ?? 0 },
          { label: "Sudah Cair", value: balance?.settled ?? 0 },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className="text-xl font-black text-gray-900">{fmt(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Send className="h-4 w-4" /> Ajukan Penarikan</h2>
        <div className="flex gap-2 max-w-md">
          <input
            type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="Nominal (Rp)" className="flex-1 border rounded-xl px-4 py-2 text-sm"
          />
          <button onClick={submit} disabled={submitting || !amount}
            className="bg-emerald-600 text-white text-sm font-bold px-5 py-2 rounded-xl disabled:opacity-50">
            {submitting ? "..." : "Ajukan"}
          </button>
        </div>
        {msg && <p className="text-sm text-gray-600 mt-2">{msg}</p>}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Wallet className="h-4 w-4" /> Riwayat</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada pengajuan.</p>
        ) : (
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between border rounded-xl px-4 py-3 text-sm">
                <div>
                  <p className="font-bold">{fmt(p.amount)}</p>
                  <p className="text-xs text-gray-500">{new Date(p.requestedAt).toLocaleString("id-ID")}</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100">{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
