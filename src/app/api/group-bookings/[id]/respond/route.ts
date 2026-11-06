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
    const status = String(body.status || "").trim().toLowerCase(); // accepted | declined
    if (!["accepted", "declined"].includes(status)) {
      return NextResponse.json({ error: "status must be accepted or declined" }, { status: 400 });
    }
    const availability: string[] | undefined = Array.isArray(body.availability) ? body.availability : undefined;

    const svc = new GroupBookingService();
    const gb = await svc.getGroupBooking(id);
    if (!gb) return NextResponse.json({ error: "Group booking not found" }, { status: 404 });

    const participant = await svc.getParticipant(id, session.userId);
    if (!participant) {
      return NextResponse.json({ error: "You are not invited to this group" }, { status: 403 });
    }

    const updated = await svc.updateParticipantStatus(id, session.userId, status as "accepted" | "declined", availability);

    // If total accepted >= min, move status to voting (if draft)
    if (status === "accepted" && gb.status === "draft") {
      const all = await svc.getParticipants(id);
      const accepted = all.filter((p) => p.status === "accepted").length + (participant.status !== "accepted" ? 1 : 0);
      if (accepted >= gb.minParticipants) {
        await svc.setStatus(id, "voting");
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
