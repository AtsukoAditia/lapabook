"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ClipboardList, Clock, CheckCircle2, Wallet, LandPlot, Activity, Settings, CloudRain, BarChart3 } from "lucide-react";

interface OwnerStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  totalCourts: number;
  activeCourts: number;
}

export default function OwnerDashboard() {
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      try {
        const res = await fetch("/api/owner/stats");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled) setStats(data.stats);
      } catch {
        // fallback: use zeros
        if (!cancelled) setStats({
          totalBookings: 0, pendingBookings: 0, confirmedBookings: 0,
          totalRevenue: 0, totalCourts: 0, activeCourts: 0,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchStats();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cards: { label: string; value: string | number; icon: LucideIcon; color: string }[] = [
    { label: "Total Booking", value: stats?.totalBookings ?? 0, icon: ClipboardList, color: "from-blue-500 to-blue-600" },
    { label: "Menunggu Konfirmasi", value: stats?.pendingBookings ?? 0, icon: Clock, color: "from-amber-500 to-orange-500" },
    { label: "Dikonfirmasi", value: stats?.confirmedBookings ?? 0, icon: CheckCircle2, color: "from-emerald-500 to-teal-500" },
    { label: "Total Pendapatan", value: `Rp${(stats?.totalRevenue ?? 0).toLocaleString("id-ID")}`, icon: Wallet, color: "from-purple-500 to-pink-500" },
    { label: "Total Lapangan", value: stats?.totalCourts ?? 0, icon: LandPlot, color: "from-cyan-500 to-blue-500" },
    { label: "Lapangan Aktif", value: stats?.activeCourts ?? 0, icon: Activity, color: "from-emerald-400 to-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Selamat datang kembali! Berikut ringkasan venue Anda.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center text-white`}>
                <card.icon aria-hidden={true} className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">{card.label}</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <a href="/dashboard/bookings" className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 border border-transparent transition-all">
            <ClipboardList aria-hidden={true} className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-medium text-gray-900 text-sm">Kelola Booking</p>
              <p className="text-xs text-gray-500">Lihat & konfirmasi</p>
            </div>
          </a>
          <a href="/dashboard/courts" className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 border border-transparent transition-all">
            <LandPlot aria-hidden={true} className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-medium text-gray-900 text-sm">Kelola Lapangan</p>
              <p className="text-xs text-gray-500">Tambah & edit</p>
            </div>
          </a>
          <a href="/dashboard/settings" className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 border border-transparent transition-all">
            <Settings aria-hidden={true} className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-medium text-gray-900 text-sm">Pengaturan</p>
              <p className="text-xs text-gray-500">Venue & akun</p>
            </div>
          </a>
          <a href="/dashboard/settings/rain" className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 border border-transparent transition-all">
            <CloudRain aria-hidden={true} className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-medium text-gray-900 text-sm">Diskon Cuaca</p>
              <p className="text-xs text-gray-500">Atur diskon hujan</p>
            </div>
          </a>
          <a href="/dashboard/bookings" className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 border border-transparent transition-all">
            <BarChart3 aria-hidden={true} className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-medium text-gray-900 text-sm">Lihat Statistik</p>
              <p className="text-xs text-gray-500">Analytics detail</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
