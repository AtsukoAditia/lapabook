import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getDatabaseAdapter } from "@/lib/adapters";
import { verifyToken, ADMIN_TOKEN_NAME } from "@/lib/auth/jwt";
import { logAudit } from "@/lib/audit";
import type { Booking } from "@/lib/types/domain";

const VALID_STATUSES: Booking["bookingStatus"][] = [
  "pending",
  "waiting_payment",
  "paid",
  "confirmed",
  "rejected",
  "cancelled",
  "completed",
  "no_show",
];

// Statuses that trigger loyalty point earning
const POINTS_EARNING_STATUSES: Booking["bookingStatus"][] = ["confirmed", "completed"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, paymentStatus } = body as { status?: string; paymentStatus?: string };

    if (!status || !VALID_STATUSES.includes(status as Booking["bookingStatus"])) {
      return NextResponse.json(
        { error: `Status tidak valid. Gunakan: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    const adapter = getDatabaseAdapter();
    const booking = await adapter.updateBookingStatus(
      id,
      status as Booking["bookingStatus"],
      paymentStatus as Booking["paymentStatus"] | undefined,
    );

    // Audit trail: siapa mengubah status booking
    try {
      const cookieStore = await cookies();
      const adminSession = await verifyToken(cookieStore.get(ADMIN_TOKEN_NAME)?.value ?? "");
      if (adminSession) {
        await logAudit(
          adminSession.userId,
          adminSession.role,
          "booking.status_update",
          "booking",
          id,
          { status, paymentStatus, bookingCode: booking.bookingCode },
        );
      }
    } catch {
      // best-effort
    }

    // Add loyalty points when booking is confirmed or completed
    if (POINTS_EARNING_STATUSES.includes(status as Booking["bookingStatus"])) {
      try {
        // Find customer by email
        const customerEmail = booking.customerEmail;
        if (customerEmail) {
          const customer = await adapter.getCustomerByEmail(customerEmail);
          if (customer) {
            // 1 point per Rp10.000 spent
            const pointsEarned = Math.floor(booking.totalPrice / 10000);
            if (pointsEarned > 0) {
              await adapter.addLoyaltyPoints(
                customer.id,
                pointsEarned,
                booking.id,
                `Booking #${booking.bookingCode} - ${booking.sportId} at ${booking.venueId}`,
                "earned",
              );
            }
          }
        }
      } catch (pointsError) {
        // Don't fail the status update if points fail
        console.warn("Failed to add loyalty points:", pointsError);
      }
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Error updating booking status:", error);
    const message =
      error instanceof Error ? error.message : "Gagal update status booking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
