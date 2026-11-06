import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, OWNER_TOKEN_NAME } from "@/lib/auth/jwt";
import { getDatabaseAdapter } from "@/lib/adapters";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(OWNER_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || session.role !== "owner" || !session.ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";

    const adapter = getDatabaseAdapter();

    // Owner venues + bookings — DB-side filter (bukan tarik semua lalu filter in-memory)
    const venues = await adapter.getVenuesByOwner(session.ownerId);
    const venueIdList = venues.map(v => v.id);
    const venueIds = new Set(venueIdList);

    const allCourts = await adapter.getAllCourts();
    const ownerCourts = allCourts.filter(c => venueIds.has(c.venueId));

    let ownerBookings = await adapter.getBookingsByVenueIds(venueIdList);

    // Filter by status
    if (status !== "all") {
      ownerBookings = ownerBookings.filter(b => b.bookingStatus === status);
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      ownerBookings = ownerBookings.filter(b => 
        b.bookingCode.toLowerCase().includes(searchLower) ||
        b.customerName.toLowerCase().includes(searchLower) ||
        b.customerPhone.includes(search)
      );
    }

    // Sort by date descending
    ownerBookings.sort((a, b) => {
      const dateA = new Date(a.bookingDate + " " + a.startTime);
      const dateB = new Date(b.bookingDate + " " + b.startTime);
      return dateB.getTime() - dateA.getTime();
    });

    // Enrich with court/venue names
    const enrichedBookings = ownerBookings.map(b => {
      const court = ownerCourts.find(c => c.id === b.courtId);
      const venue = court ? venues.find(v => v.id === court.venueId) : null;
      return {
        ...b,
        courtName: court?.name || "-",
        venueName: venue?.name || "-",
      };
    });

    return NextResponse.json({ bookings: enrichedBookings });
  } catch (error) {
    console.error("Owner bookings GET error:", error);
    return NextResponse.json({ error: "Gagal memuat data booking" }, { status: 500 });
  }
}
