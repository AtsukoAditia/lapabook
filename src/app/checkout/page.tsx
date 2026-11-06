"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { formatPrice } from "@/lib/mock-data";
import type { Court } from "@/lib/types/domain";
import MidtransSnap from "@/components/payment/MidtransSnap";
import {
  Calendar,
  Clock,
  Hourglass,
  Loader2,
  TriangleAlert,
  ArrowLeft,
  Banknote,
  CreditCard,
  Trophy,
} from "lucide-react";

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getDurationMinutes(startTime: string, endTime: string): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

type PricingInfo = {
  finalTotal: number;
  baseTotal: number;
  finalMultiplier: number;
  savings: number;
  multipliers: { name: string; factor: number; reason: string }[];
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const courtId = searchParams.get("courtId") ?? "";
  const date = searchParams.get("date") ?? "";
  const startTime = searchParams.get("startTime") ?? "";
  const endTime = searchParams.get("endTime") ?? "";

  const [court, setCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittingOnline, setSubmittingOnline] = useState(false);

  // Voucher
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number; label?: string | null } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherChecking, setVoucherChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [downPaymentType, setDownPaymentType] = useState<"full" | "dp50">("full");
  const [snapToken, setSnapToken] = useState<string | null>(null);
  const [pendingBookingCode, setPendingBookingCode] = useState<string | null>(null);

  const durationMinutes =
    startTime && endTime ? getDurationMinutes(startTime, endTime) : 60;
  const durationHours = durationMinutes / 60;

  // Fetch court detail (list + find — belum ada endpoint /api/courts/[id])
  useEffect(() => {
    if (!courtId) return;
    let cancelled = false;
    fetch(`/api/courts`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const courts = d.courts ?? d.data ?? [];
        setCourt(courts.find((c: Court) => c.id === courtId) ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courtId]);

  // Fetch dynamic pricing
  useEffect(() => {
    if (!courtId || !date || !startTime || !endTime) return;
    let cancelled = false;
    setPricingLoading(true);
    fetch(
      `/api/pricing/calculate?courtId=${courtId}&date=${date}&startTime=${startTime}&endTime=${endTime}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.finalTotal) {
          setPricingInfo(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPricingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courtId, date, startTime, endTime]);

  const fallbackTotal = court
    ? Math.round(durationHours * court.basePrice)
    : 0;
  const preDiscountTotal = pricingInfo?.finalTotal ?? fallbackTotal;
  const voucherDiscount = appliedVoucher ? Math.min(appliedVoucher.discount, preDiscountTotal) : 0;
  const totalPrice = Math.max(0, preDiscountTotal - voucherDiscount);

  async function applyVoucher() {
    if (!voucherInput.trim()) return;
    setVoucherError(null);
    setVoucherChecking(true);
    try {
      const res = await fetch("/api/vouchers/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherInput.trim(), totalAmount: preDiscountTotal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.valid) {
        setVoucherError(data?.error ?? "Kode voucher tidak berlaku.");
        return;
      }
      setAppliedVoucher({ code: String(voucherInput.trim()).toUpperCase(), discount: Number(data.discountAmount), label: data.label ?? null });
      setVoucherError(null);
    } catch {
      setVoucherError("Gagal memeriksa voucher.");
    } finally {
      setVoucherChecking(false);
    }
  }

  function removeVoucher() {
    setAppliedVoucher(null);
    setVoucherError(null);
  }

  function validate(): string | null {
    if (!court) return "Data lapangan tidak valid.";
    if (!name.trim()) return "Nama wajib diisi.";
    if (!phone.trim()) return "Nomor HP wajib diisi.";
    if (durationMinutes <= 0) return "Durasi booking tidak valid.";
    return null;
  }

  async function createBooking() {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        courtId,
        venueId: court!.venueId,
        sportId: court!.sportId,
        bookingDate: date,
        startTime,
        endTime,
        durationMinutes,
        notes: notes.trim() || undefined,
        voucherCode: appliedVoucher?.code || undefined,
        downPaymentType,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) setIsConflict(true);
      throw new Error(data.error ?? "Gagal membuat booking.");
    }
    return res.json();
  }

  async function handlePayManual(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsConflict(false);
    const v = validate();
    if (v) return setError(v);

    setSubmitting(true);
    try {
      const data = await createBooking();
      router.push(`/checkout/success?code=${data.bookingCode}&ph=${encodeURIComponent(phone.trim())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayOnline(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsConflict(false);
    const v = validate();
    if (v) return setError(v);

    setSubmittingOnline(true);
    try {
      const data = await createBooking();
      setPendingBookingCode(data.bookingCode);

      const payRes = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: data.id }),
      });

      if (!payRes.ok) {
        const payData = await payRes.json().catch(() => ({}));
        throw new Error(payData.error ?? "Gagal membuat transaksi pembayaran.");
      }

      const { snapToken: token } = await payRes.json();
      setSnapToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmittingOnline(false);
    }
  }

  const backUrl = court ? `/venue/${court.venueId}` : "/cari";

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-800" />
        <p className="text-sm text-slate-500">Memuat data lapangan...</p>
      </div>
    );
  }

  if (!court || !date || !startTime || !endTime) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Trophy className="h-8 w-8 text-slate-400" aria-hidden="true" />
        </div>
        <p className="text-lg font-semibold text-slate-700">
          Data booking tidak lengkap
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Silakan pilih lapangan & jam terlebih dahulu.
        </p>
        <button
          onClick={() => router.push("/cari")}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Pilih Lapangan
        </button>
      </div>
    );
  }

  const bookingBody = (
    <>
      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-red-700">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" /> {error}
          </p>
          {isConflict && (
            <button
              type="button"
              onClick={() => router.push(backUrl)}
              className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
            >
              Pilih Jam Lain
            </button>
          )}
        </div>
      )}

      {/* Data diri */}
      <div>
        <label htmlFor="co-name" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Nama Lengkap <span className="text-red-500">*</span>
        </label>
        <input
          id="co-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Masukkan nama lengkap"
          autoComplete="name"
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div>
        <label htmlFor="co-phone" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Nomor HP <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 border-r border-slate-300 pr-2 text-sm font-semibold text-slate-500">
            +62
          </span>
          <input
            id="co-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="8123456789"
            autoComplete="tel"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-16 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      <div>
        <label htmlFor="co-email" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Email <span className="text-xs font-normal text-slate-400">(opsional)</span>
        </label>
        <input
          id="co-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          autoComplete="email"
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div>
        <label htmlFor="co-notes" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Catatan <span className="text-xs font-normal text-slate-400">(opsional)</span>
        </label>
        <textarea
          id="co-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Misal: butuh 2 bola, ada acara khusus, dll."
          className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {/* Voucher */}
      <div>
        <label htmlFor="co-voucher" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Voucher <span className="text-xs font-normal text-slate-400">(opsional)</span>
        </label>
        {!appliedVoucher ? (
          <div className="flex gap-2">
            <input
              id="co-voucher"
              type="text"
              value={voucherInput}
              onChange={(e) => setVoucherInput(e.target.value)}
              placeholder="Masukkan kode voucher"
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="button"
              onClick={applyVoucher}
              disabled={voucherChecking}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {voucherChecking ? "Cek..." : "Apply"}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-emerald-900">{appliedVoucher.code}</p>
              {appliedVoucher.label && (
                <p className="text-xs text-emerald-700">{appliedVoucher.label}</p>
              )}
              <p className="text-xs text-emerald-700">Hemat {formatPrice(voucherDiscount)}</p>
            </div>
            <button
              type="button"
              onClick={removeVoucher}
              className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-medium text-emerald-800"
            >
              Hapus
            </button>
          </div>
        )}
        {voucherError && (
          <p className="mt-2 flex items-center gap-2 text-xs text-red-500">
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" /> {voucherError}
          </p>
        )}
      </div>

      {/* Pilihan pembayaran: Lunas / DP 50% */}
      <div>
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">
          Pilihan Pembayaran
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDownPaymentType("full")}
            className={`rounded-xl border-2 p-3 text-left transition ${
              downPaymentType === "full"
                ? "border-orange-500 bg-orange-50"
                : "border-slate-200 hover:border-orange-300"
            }`}
          >
            <p className="text-sm font-bold text-slate-900">Lunas (100%)</p>
            <p className="mt-0.5 text-xs font-semibold text-orange-600">{formatPrice(totalPrice)}</p>
            <p className="text-[11px] text-slate-500">Bayar penuh sekarang</p>
          </button>
          <button
            type="button"
            onClick={() => setDownPaymentType("dp50")}
            className={`rounded-xl border-2 p-3 text-left transition ${
              downPaymentType === "dp50"
                ? "border-orange-500 bg-orange-50"
                : "border-slate-200 hover:border-orange-300"
            }`}
          >
            <p className="text-sm font-bold text-slate-900">DP 50%</p>
            <p className="mt-0.5 text-xs font-semibold text-orange-600">{formatPrice(Math.ceil(totalPrice / 2))}</p>
            <p className="text-[11px] text-slate-500">Sisa dibayar di venue / nanti</p>
          </button>
        </div>
      </div>

      {/* CTA */}
      <div className="space-y-3 pt-2">
        <button
          type="submit"
          disabled={submitting || submittingOnline}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-orange-600 py-4 text-base font-bold text-white shadow-lg transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Memproses...
            </>
          ) : (
            <>
              <Banknote className="h-5 w-5" aria-hidden="true" /> Bayar Manual (Transfer)
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handlePayOnline}
          disabled={submittingOnline || submitting}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-blue-700 bg-white py-4 text-base font-bold text-blue-800 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submittingOnline ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Memproses...
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5" aria-hidden="true" /> Bayar Online
            </>
          )}
        </button>
        <p className="text-center text-xs text-slate-400">
          Tanpa perlu akun. Dengan mengklik, kamu menyetujui syarat & ketentuan booking.
        </p>
      </div>
    </>
  );

  const summaryBody = (
    <>
      <dl className="space-y-3">
        <div className="flex items-center gap-3">
          <Trophy className="h-4 w-4 shrink-0 text-blue-800" aria-hidden="true" />
          <div className="flex-1">
            <dt className="text-xs text-slate-500">Lapangan</dt>
            <dd className="text-sm font-semibold text-slate-900">{court.name}</dd>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 shrink-0 text-blue-800" aria-hidden="true" />
          <div className="flex-1">
            <dt className="text-xs text-slate-500">Tanggal</dt>
            <dd className="text-sm font-semibold text-slate-900">{date}</dd>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 shrink-0 text-blue-800" aria-hidden="true" />
          <div className="flex-1">
            <dt className="text-xs text-slate-500">Jam</dt>
            <dd className="text-sm font-semibold text-slate-900">
              {startTime} – {endTime}
            </dd>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Hourglass className="h-4 w-4 shrink-0 text-blue-800" aria-hidden="true" />
          <div className="flex-1">
            <dt className="text-xs text-slate-500">Durasi</dt>
            <dd className="text-sm font-semibold text-slate-900">
              {durationHours} jam
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">Total Harga</span>
          <div className="text-right">
            {pricingInfo && pricingInfo.finalMultiplier !== 1 && (
              <p className="text-xs text-slate-400 line-through">
                {formatPrice(pricingInfo.baseTotal)}
              </p>
            )}
            <span
              className={`text-xl font-extrabold ${
                pricingInfo && pricingInfo.savings < 0
                  ? "text-amber-600"
                  : pricingInfo && pricingInfo.savings > 0
                    ? "text-blue-800"
                    : "text-orange-600"
              }`}
            >
              {pricingLoading ? "..." : formatPrice(totalPrice)}
            </span>
            {pricingInfo && pricingInfo.multipliers.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {pricingInfo.multipliers.map((m, i) => (
                  <p key={i} className="text-[10px] text-slate-500">
                    {m.reason}
                  </p>
                ))}
              </div>
            )}
            {pricingInfo && pricingInfo.savings > 0 && (
              <p className="text-xs font-medium text-blue-800">
                Hemat {formatPrice(pricingInfo.savings)}
              </p>
            )}
            {pricingInfo && pricingInfo.savings < 0 && (
              <p className="text-xs font-medium text-amber-600">
                +{formatPrice(Math.abs(pricingInfo.savings))} surcharge
              </p>
            )}
          </div>
        </div>

        {appliedVoucher && (
          <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
            <span className="text-xs font-medium text-emerald-800">Voucher {appliedVoucher.code}</span>
            <span className="text-xs font-semibold text-emerald-700">-{formatPrice(voucherDiscount)}</span>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Slim header */}
      <header className="bg-blue-900 px-4 py-5 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => router.push(backUrl)}
            className="mb-2 inline-flex cursor-pointer items-center gap-1.5 text-sm text-blue-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali pilih jam
          </button>
          <h1 className="text-xl font-black sm:text-2xl">Checkout</h1>
          <p className="mt-0.5 text-sm text-blue-200">
            Langkah terakhir — isi data & bayar.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-40 sm:px-6 lg:pb-8">
        <form onSubmit={handlePayManual} className="grid gap-5 lg:grid-cols-5">
          {/* Summary — mobile top */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:hidden">
            {summaryBody}
          </section>

          {/* Form column */}
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
            {bookingBody}
          </section>

          {/* Summary — desktop right (sticky) */}
          <aside className="hidden lg:col-span-2 lg:block">
            <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {summaryBody}
            </div>
          </aside>
        </form>
      </main>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500">Total</div>
            <div className="text-lg font-extrabold text-orange-600">
              {pricingLoading ? "..." : formatPrice(totalPrice)}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePayManual}
              disabled={submitting || submittingOnline}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Banknote className="h-4 w-4" aria-hidden="true" />
              )}
              Manual
            </button>
            <button
              type="button"
              onClick={handlePayOnline}
              disabled={submittingOnline || submitting}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border-2 border-blue-700 bg-white px-4 py-2.5 text-sm font-bold text-blue-800 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingOnline ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CreditCard className="h-4 w-4" aria-hidden="true" />
              )}
              Online
            </button>
          </div>
        </div>
      </div>

      {snapToken && (
        <MidtransSnap
          snapToken={snapToken}
          onSuccess={() => router.push(`/checkout/success?code=${pendingBookingCode}&ph=${encodeURIComponent(phone.trim())}`)}
          onPending={() => router.push(`/checkout/success?code=${pendingBookingCode}&ph=${encodeURIComponent(phone.trim())}`)}
          onError={() => router.push(`/checkout/success?code=${pendingBookingCode}&ph=${encodeURIComponent(phone.trim())}`)}
          onClose={() => setSnapToken(null)}
        />
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-800" />
          <p className="text-sm text-slate-500">Memuat checkout...</p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
