"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Lock, Check } from "lucide-react";

interface BookingDetail {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  venueId: string;
  courtId: string;
  sportId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalPrice: number;
  bookingStatus: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  paymentProofUrl?: string;
  notes?: string;
  rescheduledFrom?: { bookingDate: string; startTime: string; endTime: string } | null;
  rescheduleCount?: number;
}

const STATUS_STEPS: { status: string; label: string }[] = [
  { status: "pending", label: "Booking Dibuat" },
  { status: "waiting_payment", label: "Menunggu Bayar" },
  { status: "waiting_verification", label: "Verifikasi" },
  { status: "confirmed", label: "Dikonfirmasi" },
  { status: "completed", label: "Selesai" },
];

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  waiting_payment: "bg-yellow-100 text-yellow-700",
  waiting_verification: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-700",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Dikonfirmasi",
  completed: "Selesai",
  waiting_payment: "Menunggu Bayar",
  waiting_verification: "Menunggu Verifikasi",
  cancelled: "Dibatalkan",
  rejected: "Ditolak",
  expired: "Kedaluwarsa",
  no_show: "No Show",
};

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatPrice(p: number) {
  return `Rp ${p?.toLocaleString("id-ID")}`;
}

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showResched, setShowResched] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [reschedMsg, setReschedMsg] = useState("");
  const [reschedLoading, setReschedLoading] = useState(false);

  const fetchBooking = () => {
    fetch(`/api/bookings/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setBooking(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBooking(); }, [params.id]);

  const handleVerifyPhone = () => {
    fetch(`/api/bookings/${params.id}?phone=${phoneInput}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setBooking(data);
          setPhoneVerified(true);
          setError("");
        }
      });
  };

  const handleReschedule = async () => {
    if (!booking || !newDate || !newStart || !newEnd) { setReschedMsg("Isi tanggal dan jam baru."); return; }
    setReschedLoading(true);
    setReschedMsg("");
    try {
      const res = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingDate: newDate, startTime: newStart, endTime: newEnd }),
      });
      const data = await res.json();
      if (!res.ok) { setReschedMsg(data.error || "Gagal reschedule."); return; }
      setShowResched(false);
      fetchBooking();
    } catch {
      setReschedMsg("Gagal memindahkan jadwal.");
    } finally {
      setReschedLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!booking || !confirm("Yakin ingin membatalkan booking ini?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${params.id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (data.booking) setBooking(data.booking);
      else alert(data.error || "Gagal");
    } catch {
      alert("Gagal membatalkan booking");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-16">
        <div className="max-w-lg mx-auto text-center">
          <Lock className="mx-auto mb-3 h-10 w-10 text-gray-300" aria-hidden={true} />
          <p className="text-gray-600 mb-4">{error}</p>
          <input
            type="tel"
            placeholder="Masukkan nomor telepon untuk verifikasi"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full px-3 py-2 border rounded-lg mb-3"
          />
          <button onClick={handleVerifyPhone} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            Verifikasi
          </button>
          <div className="mt-4">
            <Link href="/profile/bookings" className="text-emerald-600 text-sm hover:underline">← Kembali</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const currentStep = STATUS_STEPS.findLastIndex((s) => {
    const order = STATUS_STEPS.map((x) => x.status);
    return order.indexOf(s.status) <= order.indexOf(
      booking.bookingStatus === "waiting_payment" ? "waiting_payment" :
      booking.bookingStatus === "waiting_verification" ? "waiting_verification" :
      booking.bookingStatus === "confirmed" ? "confirmed" :
      booking.bookingStatus === "completed" ? "completed" :
      "pending"
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <Link href="/profile/bookings" className="text-emerald-600 text-sm hover:underline">← Booking Saya</Link>
          <h1 className="text-lg font-bold mt-1">Detail Booking</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Status Badge */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-sm text-gray-500">{booking.bookingCode}</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[booking.bookingStatus] || "bg-gray-100"}`}>
              {STATUS_LABEL[booking.bookingStatus] || booking.bookingStatus}
            </span>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-1 mb-4">
            {STATUS_STEPS.map((step, i) => (
              <div key={step.status} className="flex-1 flex items-center">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i <= currentStep ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-400"
                }`}>
                  {i < currentStep ? <Check className="h-3 w-3" aria-hidden={true} /> : i + 1}
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-0.5 ${i < currentStep ? "bg-emerald-600" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex text-[10px] text-gray-400 justify-between">
            {STATUS_STEPS.map((step) => (
              <span key={step.status} className="text-center">{step.label}</span>
            ))}
          </div>
        </div>

        {/* Detail Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm border space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Tanggal</span><span className="font-medium">{formatDate(booking.bookingDate)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Jam</span><span className="font-medium">{booking.startTime?.slice(0, 5)} - {booking.endTime?.slice(0, 5)} ({booking.durationMinutes} menit)</span></div>
          <hr />
          <div className="flex justify-between"><span className="text-gray-500">Harga</span><span className="font-bold text-emerald-600">{formatPrice(booking.totalPrice)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Pembayaran</span><span className={`font-medium ${booking.paymentStatus === "paid" ? "text-green-600" : "text-yellow-600"}`}>{booking.paymentStatus === "paid" ? "Lunas" : booking.paymentStatus}</span></div>
          {booking.notes && (
            <div className="flex justify-between"><span className="text-gray-500">Catatan</span><span>{booking.notes}</span></div>
          )}
        </div>

        {/* Reschedule badge */}
        {booking.rescheduleCount != null && booking.rescheduleCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
            <span className="font-bold">Di-reschedule 1x</span>
            {booking.rescheduledFrom && (
              <span> dari {booking.rescheduledFrom.bookingDate} {booking.rescheduledFrom.startTime?.slice(0, 5)}-{booking.rescheduledFrom.endTime?.slice(0, 5)}</span>
            )}
          </div>
        )}

        {/* Reschedule form */}
        {["confirmed", "paid", "waiting_payment", "waiting_verification"].includes(booking.bookingStatus) && (
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            {!showResched ? (
              <button onClick={() => setShowResched(true)} className="w-full py-3 border border-emerald-600 text-emerald-700 rounded-lg font-medium hover:bg-emerald-50">
                Pindah Jadwal (max 1x, H-3)
              </button>
            ) : (
              <div className="space-y-2">
                <p className="font-bold text-sm">Pindah Jadwal</p>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                <div className="flex gap-2">
                  <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" />
                  <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" />
                </div>
                {reschedMsg && <p className="text-sm text-red-600">{reschedMsg}</p>}
                <div className="flex gap-2">
                  <button onClick={handleReschedule} disabled={reschedLoading} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50">
                    {reschedLoading ? "Menyimpan..." : "Simpan Jadwal Baru"}
                  </button>
                  <button onClick={() => setShowResched(false)} className="px-4 py-2.5 border rounded-lg text-gray-600">Batal</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {booking.bookingStatus === "waiting_payment" && (
          <div className="space-y-2">
            <a
              href={`/checkout/success?code=${booking.bookingCode}${phoneInput ? `&ph=${encodeURIComponent(phoneInput)}` : ""}`}
              className="block w-full text-center py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
            >
              Upload Bukti Bayar
            </a>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full py-3 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50"
            >
              {cancelling ? "Membatalkan..." : "Batalkan Booking"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
