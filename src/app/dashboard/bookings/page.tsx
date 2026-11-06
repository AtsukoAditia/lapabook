"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Clock, CreditCard, Search, CheckCircle2, X, Ban, AlarmClock, UserX, ClipboardList, User, Phone } from "lucide-react";

interface Booking {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  courtName: string;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalPrice: number;
  bookingStatus: string;
  paymentStatus: string;
  notes?: string;
  downPaymentAmount?: number;
  paidAmount?: number;
  rescheduleCount?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-700", icon: Clock },
  waiting_payment: { label: "Menunggu Pembayaran", color: "bg-amber-100 text-amber-800", icon: CreditCard },
  waiting_verification: { label: "Menunggu Verifikasi", color: "bg-blue-100 text-blue-800", icon: Search },
  paid: { label: "Sudah Dibayar", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  confirmed: { label: "Dikonfirmasi", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  rejected: { label: "Ditolak", color: "bg-red-100 text-red-700", icon: X },
  cancelled: { label: "Dibatalkan", color: "bg-gray-100 text-gray-600", icon: Ban },
  expired: { label: "Kedaluwarsa", color: "bg-gray-100 text-gray-500", icon: AlarmClock },
  completed: { label: "Selesai", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  no_show: { label: "Tidak Hadir", color: "bg-orange-100 text-orange-700", icon: UserX },
};

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (search) params.set("search", search);

    fetch(`/api/owner/bookings?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterStatus, search]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  const statusCounts = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.bookingStatus] = (acc[b.bookingStatus] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900">Booking</h1>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
        <span className="text-gray-400">›</span>
        <span className="text-gray-900 font-medium">Booking</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Booking</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola semua booking di venue Anda</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-3xl font-black text-gray-900">{bookings.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Booking</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-3xl font-black text-amber-600">
            {(statusCounts.waiting_payment || 0) + (statusCounts.waiting_verification || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Menunggu</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-3xl font-black text-emerald-600">{statusCounts.confirmed || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Dikonfirmasi</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-3xl font-black text-blue-600">
            Rp {bookings.filter(b => b.paymentStatus === "paid").reduce((sum, b) => sum + b.totalPrice, 0).toLocaleString("id-ID")}
          </p>
          <p className="text-sm text-gray-500 mt-1">Total Pendapatan</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Cari kode booking / nama customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="waiting_payment">Menunggu Pembayaran</option>
          <option value="waiting_verification">Menunggu Verifikasi</option>
          <option value="confirmed">Dikonfirmasi</option>
          <option value="completed">Selesai</option>
          <option value="cancelled">Dibatalkan</option>
          <option value="expired">Kedaluwarsa</option>
        </select>
      </div>

      {/* Booking List */}
      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <ClipboardList aria-hidden={true} className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-700 mb-2">
            {filterStatus !== "all" || search ? "Tidak ada booking" : "Belum ada booking"}
          </p>
          <p className="text-gray-500">
            {filterStatus !== "all" || search
              ? "Tidak ada booking dengan filter ini"
              : "Booking dari customer akan muncul di sini"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const statusInfo = STATUS_CONFIG[booking.bookingStatus] ?? STATUS_CONFIG.pending;
            return (
              <div
                key={booking.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{booking.bookingCode}</h3>
                      {booking.rescheduleCount != null && booking.rescheduleCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Reschedule 1x</span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${statusInfo.color}`}>
                        <statusInfo.icon aria-hidden={true} className="h-3 w-3" /> {statusInfo.label}
                      </span>
                    </div>
                    <p className="flex items-center gap-1.5 text-sm text-gray-600">
                      <User aria-hidden={true} className="h-4 w-4" /> {booking.customerName} <span className="text-gray-400">•</span> <Phone aria-hidden={true} className="h-4 w-4" /> {booking.customerPhone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-gray-900">
                      Rp {booking.totalPrice.toLocaleString("id-ID")}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {booking.paymentStatus === "paid" ? "Lunas" : booking.paymentStatus === "dp_paid" ? `DP — Sisa Rp ${Math.max(0, booking.totalPrice - (booking.paidAmount ?? 0)).toLocaleString("id-ID")}` : "Belum Lunas"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tanggal</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(booking.bookingDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Waktu</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Lapangan</p>
                    <p className="text-sm font-medium text-gray-900">{booking.courtName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Venue</p>
                    <p className="text-sm font-medium text-gray-900">{booking.venueName}</p>
                  </div>
                </div>

                {booking.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Catatan</p>
                    <p className="text-sm text-gray-700">{booking.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
