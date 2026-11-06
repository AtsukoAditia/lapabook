import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { GroupBookingService } from "@/lib/services/group-booking-service";

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

    const body = await request.json();
    const timeSlotId = String(body.timeSlotId || body.slotId || "").trim();
    if (!timeSlotId) return NextResponse.json({ error: "timeSlotId required" }, { status: 400 });

    const svc = new GroupBookingService();
    const participant = await svc.getParticipant(id, session.userId);
    if (!participant || participant.status === "declined") {
      return NextResponse.json({ error: "Not allowed to vote (not accepted)" }, { status: 403 });
    }

    const slot = await svc.getTimeSlot(timeSlotId);
    if (!slot || slot.groupBookingId !== id) {
      return NextResponse.json({ error: "Invalid time slot" }, { status: 400 });
    }

    const voted = await svc.voteTimeSlot(timeSlotId, session.userId);

    // Determine most voted slot? Organizer finalizes, but we return updated counts.
    const detail = await svc.getGroupBookingDetail(id);

    return NextResponse.json({ success: true, data: { voted, group: detail } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
