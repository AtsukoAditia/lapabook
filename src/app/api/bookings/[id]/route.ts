import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BookingService } from "@/lib/services/booking-service";
import { getDatabaseAdapter } from "@/lib/adapters";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { bookingLimiter, apiLimiter, getClientIP, checkRateLimit } from "@/lib/security";
import type { Booking } from "@/lib/types/domain";

/**
 * Booking lookup by bookingCode — IDOR hardened.
 *
 * Access tiers:
 * (a) Valid customer_token session AND booking.userId === session.userId → full booking.
 * (b) No session but ?phone= matches booking.customerPhone (exact or E.164-normalized)
 *     → redacted (no customerEmail, no userId).
 * (c) Otherwise → 403.
 *
 * Rate-limited via bookingLimiter (phone lookups are brute-forceable).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: code } = await params;
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone")?.replace(/[^0-9+]/g, "") || "";

    const ip = getClientIP(request);
    // Phone lookups are brute-forceable → strict bookingLimiter.
    // ponytail: no-phone requests get apiLimiter so success-page 5s polling survives; bookingLimiter covers the phone-guessing vector.
    const rateLimited = await checkRateLimit(
      phone ? bookingLimiter : apiLimiter,
      ip,
    );
    if (rateLimited) {
      return NextResponse.json(
        {
          error: `Terlalu banyak request. Coba lagi dalam ${rateLimited.retryAfter} detik.`,
        },
        { status: 429 },
      );
    }

    const adapter = getDatabaseAdapter();
    const service = new BookingService(adapter);

    // Expire stale bookings before lookup
    await service.expireBookings();

    const booking = await service.getBookingByCode(code);

    if (!booking) {
      return NextResponse.json(
        { error: "Booking tidak ditemukan." },
        { status: 404 },
      );
    }

    // (a) Session owner → full booking
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (
      session?.role === "customer" &&
      booking.userId &&
      booking.userId === session.userId
    ) {
      return NextResponse.json(booking);
    }

    // (b) Phone match → redacted
    if (phone && booking.customerPhone) {
      const normalize = (p: string) => p.replace(/[^0-9]/g, "");
      const inputPhone = normalize(phone);
      const storedPhone = normalize(booking.customerPhone);
      const match =
        inputPhone === storedPhone ||
        inputPhone === "62" + storedPhone.replace(/^0/, "") ||
        "62" + inputPhone.replace(/^0/, "") === storedPhone;

      if (match) {
        return NextResponse.json(toPublicBooking(booking));
      }
    }

    // (c) Otherwise → 403
    return NextResponse.json(
      { error: "Verifikasi nomor telepon diperlukan untuk melihat booking ini." },
      { status: 403 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengambil data booking.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function toPublicBooking(b: Booking) {
  const paid = b.paidAmount ?? 0;
  return {
    id: b.id,
    bookingCode: b.bookingCode,
    customerName: b.customerName,
    venueId: b.venueId,
    courtId: b.courtId,
    sportId: b.sportId,
    bookingDate: b.bookingDate,
    startTime: b.startTime,
    endTime: b.endTime,
    durationMinutes: b.durationMinutes,
    totalPrice: b.totalPrice,
    bookingStatus: b.bookingStatus,
    paymentStatus: b.paymentStatus,
    downPaymentAmount: b.downPaymentAmount ?? 0,
    paidAmount: paid,
    remaining: Math.max(0, b.totalPrice - paid),
    expiresAt: b.expiresAt,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}
