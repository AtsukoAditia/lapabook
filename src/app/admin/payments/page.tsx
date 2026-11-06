"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CreditCard, RefreshCw, CheckCircle2, Tag, User, Building2,
  Calendar, Coins, Paperclip, XCircle, Loader2,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

type AdminPayment = {
  id: string;
  booking_code: string;
  customer_name: string;
  customer_phone: string;
  venue_id: string;
  court_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  payment_status: string;
  payment_proof_url?: string | null;
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/payments");
      const data = await res.json();
      return (data.payments ?? []) as AdminPayment[];
    } catch (err) {
      console.error("Failed to fetch payments:", err);
      return [] as AdminPayment[];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPayments().then((result) => {
      if (!cancelled) {
        setPayments(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPayments]);

  async function doAction(
    id: string,
    action: "confirm" | "reject",
    bookingCode: string,
  ) {
    if (
      !confirm(
        action === "confirm"
          ? `Konfirmasi pembayaran untuk ${bookingCode}?`
          : `Tolak bukti pembayaran untuk ${bookingCode}? Booking kembali menunggu.`,
      )
    )
      return;
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/payments/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Gagal memproses pembayaran");
        return;
      }

      setPayments(await fetchPayments());
    } catch (err) {
      console.error("Failed to process payment:", err);
      alert("Gagal memproses pembayaran");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 shadow-xl sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-white sm:text-3xl">
              <CreditCard aria-hidden={true} className="h-6 w-6" /> Konfirmasi Pembayaran
            </h1>
            <p className="mt-1 text-sm text-emerald-100">
              {payments.length} pembayaran menunggu konfirmasi
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 backdrop-blur-sm">
            <RefreshCw aria-hidden={true} className="h-5 w-5 text-white" />
            <button
              onClick={async () => {
                setLoading(true);
                setPayments(await fetchPayments());
                setLoading(false);
              }}
              className="text-sm font-semibold text-white hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white py-16 text-center">
          <CheckCircle2 aria-hidden={true} className="h-8 w-8 text-emerald-400" />
          <p className="text-lg font-bold text-slate-700">Tidak ada pembayaran menunggu konfirmasi</p>
          <p className="mt-1 text-sm text-slate-500">Semua pembayaran sudah diproses</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div
              key={p.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="h-1 bg-amber-500" />

              <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  {/* Payment Info */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700">
                        <Tag aria-hidden={true} className="h-3.5 w-3.5" /> {p.booking_code}
                      </span>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                        Menunggu Konfirmasi
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50"><User aria-hidden={true} className="h-4 w-4 text-blue-600" /></span>
                        <div>
                          <p className="text-xs text-slate-500">Pelanggan</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {p.customer_name}
                            <span className="ml-1 font-normal text-slate-500">· {p.customer_phone}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50"><Building2 aria-hidden={true} className="h-4 w-4 text-orange-600" /></span>
                        <div>
                          <p className="text-xs text-slate-500">Venue / Court</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {p.venue_id} / {p.court_id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50"><Calendar aria-hidden={true} className="h-4 w-4 text-purple-600" /></span>
                        <div>
                          <p className="text-xs text-slate-500">Jadwal</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {p.booking_date} · {p.start_time}–{p.end_time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50"><Coins aria-hidden={true} className="h-4 w-4 text-emerald-600" /></span>
                        <div>
                          <p className="text-xs text-slate-500">Total</p>
                          <p className="text-sm font-extrabold text-emerald-600">
                            Rp {Number(p.total_price).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Payment proof */}
                    {p.payment_proof_url && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                        <Paperclip aria-hidden={true} className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-medium text-blue-700">Bukti transfer sudah diupload</span>
                        <a
                          href={p.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-xs font-bold text-blue-600 hover:underline"
                        >
                          Lihat Bukti →
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                    <button
                      disabled={updatingId === p.id}
                      onClick={() => doAction(p.id, "confirm", p.booking_code)}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50"
                    >
                      {updatingId === p.id ? (
                        <Loader2 aria-hidden={true} className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 aria-hidden={true} className="h-3.5 w-3.5" />
                      )} Konfirmasi
                    </button>
                    <button
                      disabled={updatingId === p.id}
                      onClick={() => doAction(p.id, "reject", p.booking_code)}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:from-red-600 hover:to-rose-600 disabled:opacity-50"
                    >
                      <XCircle aria-hidden={true} className="h-3.5 w-3.5" /> Tolak
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
