"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Medal, Gem, Ban, CheckCircle2, type LucideIcon } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import Pagination from "@/components/admin/Pagination";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  loyaltyTier: string;
  totalSpent: number;
  memberSince: string;
  isActive: boolean;
}

const TIER_LABELS: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  bronze: { label: "Bronze", color: "bg-amber-100 text-amber-800", icon: Medal },
  silver: { label: "Silver", color: "bg-gray-100 text-gray-800", icon: Medal },
  gold: { label: "Gold", color: "bg-yellow-100 text-yellow-800", icon: Medal },
  platinum: { label: "Platinum", color: "bg-indigo-100 text-indigo-800", icon: Gem },
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchCustomers = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/customers?page=${p}&limit=25`);
      const d = await r.json();
      setCustomers(d.data ?? []);
      setTotalPages(d.pagination?.totalPages ?? 1);
      setTotal(d.pagination?.total ?? 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers(page);
  }, [page, fetchCustomers]);

  async function toggleBan(customer: Customer) {
    const action = customer.isActive ? "ban" : "unban";
    if (action === "ban" && !confirm(`Ban customer ${customer.name}? Mereka tidak bisa login sampai di-unban.`)) return;
    setTogglingId(customer.id);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Gagal update status");
        return;
      }
      setCustomers((prev) => prev.map((c) => (c.id === customer.id ? { ...c, isActive: action === "unban" } : c)));
    } catch {
      alert("Gagal update status customer");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <AdminLayout>
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-primary-700 to-blue-600 p-6 shadow-xl sm:p-8">
        <h1 className="flex items-center gap-2 text-2xl font-black text-white sm:text-3xl">
          <Users aria-hidden={true} className="h-6 w-6" /> Pelanggan
        </h1>
        <p className="mt-1 text-sm text-purple-100">{total} total pelanggan terdaftar</p>
      </div>

      {/* Stats — ponytail: count dari halaman aktif; upgrade ke aggregate endpoint bila butuh global count */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["bronze", "silver", "gold", "platinum"] as const).map((tier) => {
          const count = customers.filter((c) => c.loyaltyTier === tier).length;
          const cfg = TIER_LABELS[tier];
          return (
            <div key={tier} className="rounded-xl border bg-white p-4 text-center shadow-sm">
              <cfg.icon aria-hidden={true} className="mx-auto h-6 w-6 text-slate-400" />
              <p className="text-lg font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500">{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-lg font-bold text-slate-700">Belum ada pelanggan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => {
            const tier = TIER_LABELS[customer.loyaltyTier] || TIER_LABELS.bronze;
            return (
              <div key={customer.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-lg font-bold text-white">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900">{customer.name}</p>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${tier.color}`}>
                            <tier.icon aria-hidden={true} className="h-3 w-3" /> {tier.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{customer.email} · {customer.phone}</p>
                        <p className="text-[10px] text-gray-400">Bergabung {new Date(customer.memberSince).toLocaleDateString("id-ID")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-xs text-gray-500">Poin</p>
                        <p className="text-sm font-bold text-indigo-600">{customer.loyaltyPoints.toLocaleString("id-ID")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Belanja</p>
                        <p className="text-sm font-bold text-emerald-600">Rp {customer.totalSpent.toLocaleString("id-ID")}</p>
                      </div>
                      <button
                        disabled={togglingId === customer.id}
                        onClick={() => toggleBan(customer)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50 ${customer.isActive ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
                      >
                        {togglingId === customer.id ? (
                          <span className="inline-flex items-center gap-1">
                            <Ban aria-hidden={true} className="h-3.5 w-3.5 animate-pulse" /> Ban...
                          </span>
                        ) : customer.isActive ? (
                          <span className="inline-flex items-center gap-1">
                            <Ban aria-hidden={true} className="h-3.5 w-3.5" /> Ban
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 aria-hidden={true} className="h-3.5 w-3.5" /> Unban
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </AdminLayout>
  );
}
