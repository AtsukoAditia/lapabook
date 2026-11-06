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
    // Accept either single object or array
    const slots: { slotDate: string; startTime: string; endTime: string }[] = Array.isArray(body)
      ? body
      : body.timeSlots
        ? body.timeSlots
        : body.slotDate
          ? [body]
          : [];

    if (!slots.length) {
      return NextResponse.json({ error: "At least one time slot required" }, { status: 400 });
    }

    const svc = new GroupBookingService();
    const gb = await svc.getGroupBooking(id);
    if (!gb) return NextResponse.json({ error: "Group booking not found" }, { status: 404 });
    if (gb.organizerId !== session.userId) {
      return NextResponse.json({ error: "Only organizer can add slots" }, { status: 403 });
    }

    const added = [];
    for (const s of slots.slice(0, 5)) {
      const addedSlot = await svc.addTimeSlot({
        groupBookingId: id,
        slotDate: s.slotDate,
        startTime: s.startTime,
        endTime: s.endTime,
      });
      added.push(addedSlot);
    }

    return NextResponse.json({ success: true, data: added });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const svc = new GroupBookingService();
    const slots = await svc.getTimeSlots(id);
    return NextResponse.json({ success: true, data: slots });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
