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
    const customerIds: string[] = (body.customerIds as string[]) || [];
    if (!customerIds.length || customerIds.length > 30) {
      return NextResponse.json({ error: "customerIds 1..30 required" }, { status: 400 });
    }

    const svc = new GroupBookingService();
    const gb = await svc.getGroupBooking(id);
    if (!gb) return NextResponse.json({ error: "Group booking not found" }, { status: 404 });
    if (gb.organizerId !== session.userId) {
      return NextResponse.json({ error: "Only organizer can invite" }, { status: 403 });
    }

    // Enforce max_participants
    const existing = await svc.getParticipants(id);
    const remaining = gb.maxParticipants - existing.length;
    if (customerIds.length > remaining) {
      return NextResponse.json({ error: `Only ${remaining} slots remaining` }, { status: 400 });
    }

    const added = [];
    for (const cid of customerIds) {
      try {
        const p = await svc.addParticipant(id, cid, false);
        added.push(p);
      } catch (e) {
        console.warn("Invite failed for", cid, e);
      }
    }

    const detail = await svc.getGroupBookingDetail(id);
    return NextResponse.json({ success: true, data: detail, addedCount: added.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
