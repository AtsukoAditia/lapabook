import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { GroupBookingService } from "@/lib/services/group-booking-service";
import { validateCreateGroupBooking } from "@/lib/validators/group-booking-validator";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await verifyToken(token);
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const svc = new GroupBookingService();
    const list = await svc.getMyGroupBookings(session.userId);
    return NextResponse.json({ success: true, data: list });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await verifyToken(token);
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      venueId, courtId, sportId, title, description,
      minParticipants, maxParticipants, pricePerSlot, deadline,
      timeSlots,
    } = body;

    const minP = typeof minParticipants === "number" ? minParticipants : parseInt(minParticipants);
    const maxP = typeof maxParticipants === "number" ? maxParticipants : parseInt(maxParticipants);

    const validation = validateCreateGroupBooking({
      venueId: String(venueId || ""),
      courtId: String(courtId || ""),
      sportId: String(sportId || ""),
      title: String(title || ""),
      minParticipants: minP || 2,
      maxParticipants: maxP || 10,
      timeSlots: timeSlots || [],
    });

    if (!validation.success) {
      return NextResponse.json({ error: validation.errors?.[0] ?? "Input tidak valid", errors: validation.errors }, { status: 400 });
    }

    const svc = new GroupBookingService();
    const gb = await svc.createGroupBooking({
      organizerId: session.userId,
      venueId: String(venueId),
      courtId: String(courtId),
      sportId: String(sportId),
      title: String(title).trim(),
      description: description ? String(description).trim() : undefined,
      minParticipants: minP,
      maxParticipants: maxP,
      pricePerSlot: typeof pricePerSlot === "number" ? pricePerSlot : parseFloat(pricePerSlot) || 0,
      deadline: deadline ? String(deadline) : undefined,
    });

    // add organizer as participant
    await svc.addParticipant(gb.id, session.userId, true);

    // add time slots, if provided
    for (const slot of (timeSlots as { slotDate: string; startTime: string; endTime: string }[])) {
      await svc.addTimeSlot({ groupBookingId: gb.id, slotDate: slot.slotDate, startTime: slot.startTime, endTime: slot.endTime });
    }

    const detail = await svc.getGroupBookingDetail(gb.id);
    return NextResponse.json({ success: true, data: detail }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal membuat group booking";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
