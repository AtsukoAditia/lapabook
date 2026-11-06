"use client";

import { useEffect, useState } from "react";
import { Banknote } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

interface Payout {
  id: string; ownerId: string; ownerName: string | null;
  venueId: string | null; venueName: string | null;
  amount: number; status: string; note: string;
  requestedAt: string; decidedAt: string | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const fetchData = () => {
    fetch("/api/admin/payouts")
      .then((r) => r.json())
      .then((d) => { if (d.payouts) setPayouts(d.payouts); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const decide = async (id: string, action: "approve" | "reject" | "paid") => {
    setMsg("");
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Gagal");
      fetchData();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-black flex items-center gap-2"><Banknote className="h-6 w-6" /> Payout Owner</h1>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        {loading ? (
          <p className="text-sm text-gray-500">Memuat...</p>
        ) : payouts.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada pengajuan.</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Nominal</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Diajukan</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-bold">{p.ownerName ?? p.ownerId}</p>
                      {p.venueName && <p className="text-xs text-gray-500">{p.venueName}</p>}
                    </td>
                    <td className="px-4 py-3 font-bold">{fmt(p.amount)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100">{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.requestedAt).toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3">
                      {p.status === "requested" ? (
                        <div className="flex gap-2">
                          <button onClick={() => decide(p.id, "approve")} className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-600 text-white">Approve</button>
                          <button onClick={() => decide(p.id, "reject")} className="text-xs font-bold px-3 py-1 rounded-lg bg-red-100 text-red-700">Reject</button>
                        </div>
                      ) : p.status === "approved" ? (
                        <button onClick={() => decide(p.id, "paid")} className="text-xs font-bold px-3 py-1 rounded-lg bg-blue-600 text-white">Tandai Paid</button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
