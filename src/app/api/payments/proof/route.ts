import { NextRequest, NextResponse } from "next/server";
import { BookingService } from "@/lib/services/booking-service";
import { getDatabaseAdapter } from "@/lib/adapters";
import type { Booking } from "@/lib/types/domain";
import { bookingLimiter, getClientIP, checkRateLimit, sanitizeHTML } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);

    // Rate limit
    const rateLimited = await checkRateLimit(bookingLimiter, ip);
    if (rateLimited) {
      return NextResponse.json(
        { error: `Terlalu banyak request. Coba lagi dalam ${rateLimited.retryAfter} detik.` },
        { status: 429 },
      );
    }

    const body = await request.json();
    const bookingCode = sanitizeHTML(String(body.bookingCode || "")).slice(0, 20);
    const bookingId = sanitizeHTML(String(body.bookingId || "")).slice(0, 50);
    const phone = String(body.phone || "").replace(/[^0-9+]/g, "").slice(0, 20);
    const proofUrl = sanitizeHTML(String(body.proofUrl || "")).slice(0, 2000);
    const isSettlement = body.isSettlement === true;

    if (!proofUrl) {
      return NextResponse.json(
        { error: "proofUrl is required" },
        { status: 400 },
      );
    }

    if (!bookingCode) {
      return NextResponse.json(
        { error: "bookingCode is required" },
        { status: 400 },
      );
    }

    const adapter = getDatabaseAdapter();
    const service = new BookingService(adapter);

    const booking = await service.submitPaymentProofByCode({
      bookingCode,
      phone,
      proofUrl,
      isSettlement,
    });

    return NextResponse.json({ success: true, booking: toPublicPaymentBooking(booking) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit payment proof";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function toPublicPaymentBooking(booking: Booking) {
  const paid = booking.paidAmount ?? 0;
  return {
    id: booking.id,
    bookingCode: booking.bookingCode,
    bookingStatus: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    totalPrice: booking.totalPrice,
    downPaymentAmount: booking.downPaymentAmount ?? 0,
    paidAmount: paid,
    remaining: Math.max(0, booking.totalPrice - paid),
    expiresAt: booking.expiresAt,
    updatedAt: booking.updatedAt,
  };
}
