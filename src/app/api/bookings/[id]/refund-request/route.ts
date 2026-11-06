import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PaymentService } from "@/lib/services/payment-service";
import { getDatabaseAdapter } from "@/lib/adapters";
import {
  verifyToken,
  CUSTOMER_TOKEN_NAME,
  OWNER_TOKEN_NAME,
} from "@/lib/auth/jwt";

const paymentService = new PaymentService();

type RouteContext = { params: Promise<{ id: string }> };

function phonesMatch(a: string, b: string): boolean {
  const norm = (p: string) => p.replace(/[^0-9]/g, "");
  const x = norm(a);
  const y = norm(b);
  return (
    x === y ||
    x === "62" + y.replace(/^0/, "") ||
    "62" + x.replace(/^0/, "") === y
  );
}

/**
 * POST /api/bookings/[id]/refund-request
 * Customer (session owner / phone match) atau owner venue ajukan refund
 * untuk booking paid/dp_paid. Body: { phone?, reason? }.
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { phone = "", reason = "" } = body as {
      phone?: string;
      reason?: string;
    };

    const adapter = getDatabaseAdapter();
    const booking =
      (await adapter.getBookingById(id)) ??
      (await adapter.getBookingByCode(id));
    if (!booking) {
      return NextResponse.json(
        { error: "Booking tidak ditemukan." },
        { status: 404 },
      );
    }

    const cookieStore = await cookies();
    const customerSession = await verifyToken(
      cookieStore.get(CUSTOMER_TOKEN_NAME)?.value ?? "",
    ).catch(() => null);
    const ownerSession = await verifyToken(
      cookieStore.get(OWNER_TOKEN_NAME)?.value ?? "",
    ).catch(() => null);

    let authorized = false;

    // (a) Customer session owner
    if (
      customerSession?.role === "customer" &&
      booking.userId &&
      booking.userId === customerSession.userId
    ) {
      authorized = true;
    }

    // (b) Phone match (tanpa session)
    if (
      !authorized &&
      phone &&
      booking.customerPhone &&
      phonesMatch(phone, booking.customerPhone)
    ) {
      authorized = true;
    }

    // (c) Owner venue
    if (!authorized && ownerSession?.role === "owner" && ownerSession.ownerId) {
      const venues = await adapter.getVenuesByOwner(ownerSession.ownerId);
      if (venues.some((v) => v.id === booking.venueId)) authorized = true;
    }

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updated = await paymentService.requestRefund(
      booking.id,
      String(reason || "").slice(0, 500),
      customerSession?.userId ?? ownerSession?.ownerId,
    );

    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengajukan refund";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
