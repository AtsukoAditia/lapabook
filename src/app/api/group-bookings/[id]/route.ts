import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { GroupBookingService } from "@/lib/services/group-booking-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;

    const svc = new GroupBookingService();
    const gb = await svc.getGroupBookingDetail(id);
    if (!gb) return NextResponse.json({ error: "Group booking not found" }, { status: 404 });

    // Allow organizer or participant or public read if status open?
    // For now allow any authenticated customer; organizer check is for mutations.
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ success: true, data: gb });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const svc = new GroupBookingService();
    const gb = await svc.getGroupBooking(id);
    if (!gb) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (gb.organizerId !== session.userId) {
      return NextResponse.json({ error: "Forbidden: not organizer" }, { status: 403 });
    }
    await svc.setStatus(id, "cancelled");
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
