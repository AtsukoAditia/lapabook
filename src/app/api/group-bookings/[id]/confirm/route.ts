import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { GroupBookingService } from "@/lib/services/group-booking-service";
import { getDatabaseAdapter } from "@/lib/adapters";
import { BookingService } from "@/lib/services/booking-service";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await verifyToken(token);
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const explicitSlotId = (body as { timeSlotId?: string })?.timeSlotId
      ? String((body as { timeSlotId: string }).timeSlotId).trim()
      : "";

    const svc = new GroupBookingService();
    const detail = await svc.getGroupBookingDetail(id);
    if (!detail) return NextResponse.json({ error: "Group booking not found" }, { status: 404 });
    if (detail.organizerId !== session.userId) {
      return NextResponse.json({ error: "Only organizer can confirm" }, { status: 403 });
    }

    const accepted = detail.participants.filter(
      (p: { status: string }) => p.status === "accepted" || p.status === "confirmed",
    );
    if (accepted.length < detail.minParticipants) {
      return NextResponse.json(
        { error: `Butuh minimal ${detail.minParticipants} peserta. Saat ini ${accepted.length} yang accept.` },
        { status: 400 },
      );
    }

    let winnerSlot = detail.timeSlots.find((s: { isWinner: boolean }) => s.isWinner) || null;
    if (explicitSlotId) {
      winnerSlot = detail.timeSlots.find((s: { id: string }) => s.id === explicitSlotId) || null;
      if (!winnerSlot) return NextResponse.json({ error: "Invalid timeSlotId" }, { status: 400 });
      await svc.markWinner(id, explicitSlotId);
    } else if (!winnerSlot) {
      const sorted = [...detail.timeSlots].sort(
        (a: { voteCount: number }, b: { voteCount: number }) => b.voteCount - a.voteCount,
      );
      if (!sorted[0]) return NextResponse.json({ error: "No time slots available" }, { status: 400 });
      winnerSlot = sorted[0];
      await svc.markWinner(id, winnerSlot.id);
    }

    if (!winnerSlot) return NextResponse.json({ error: "Winner slot not resolvable" }, { status: 400 });

    const adapter = getDatabaseAdapter();
    const bookingService = new BookingService(adapter);

    let finalBooking;
    try {
      const [sh, sm] = winnerSlot.startTime.split(":").map(Number);
      const [eh, em] = winnerSlot.endTime.split(":").map(Number);
      const durationMinutes = eh * 60 + em - (sh * 60 + sm);

      const customer = await adapter.getCustomerById(detail.organizerId);
      if (!customer) throw new Error("Organizer customer not found");

      finalBooking = await bookingService.createBooking({
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        venueId: detail.venueId,
        courtId: detail.courtId,
        sportId: detail.sportId,
        bookingDate: winnerSlot.slotDate,
        startTime: winnerSlot.startTime,
        endTime: winnerSlot.endTime,
        durationMinutes: durationMinutes > 0 ? durationMinutes : detail.durationMinutes,
        notes: `Group booking ${detail.title} (${detail.id}) — ${accepted.length} participants`,
        userId: detail.organizerId,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create final booking";
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    // ponytail: even split rounded to integer; remainder added to organizer for exact total match
    const total = finalBooking.totalPrice;
    const count = Math.max(accepted.length, 1);
    const base = Math.floor(total / count);
    const remainder = total - base * count;
    const sortedAccepted = [...(accepted as { id: string; isOrganizer?: boolean }[])].sort((a, b) => (b.isOrganizer ? 1 : 0) - (a.isOrganizer ? 1 : 0));
    // Actually sort organizer first
    sortedAccepted.sort((a, b) => (a.isOrganizer ? -1 : 1));
    for (let i = 0; i < sortedAccepted.length; i++) {
      const pid = sortedAccepted[i].id;
      const amount = i === 0 ? base + remainder : base;
      try {
        await pool.query(
          `UPDATE group_booking_participants SET split_amount = $1, status = 'confirmed', confirmed_at = NOW() WHERE id = $2`,
          [amount, pid],
        );
      } catch (e) {
        console.error("Failed to update split for", pid, e);
      }
    }
    const splitBase = total / count;

    await svc.setStatus(id, "confirmed", finalBooking.id);
    const updatedDetail = await svc.getGroupBookingDetail(id);

    return NextResponse.json({
      success: true,
      data: {
        groupBooking: updatedDetail,
        finalBooking,
        splitAmount: splitBase,
        winnerSlot,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
