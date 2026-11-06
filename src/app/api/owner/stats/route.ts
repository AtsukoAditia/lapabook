import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, OWNER_TOKEN_NAME } from "@/lib/auth/jwt";
import { getDatabaseAdapter } from "@/lib/adapters";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPoolOwnerStats?: Pool };
const pool = globalForPg.__pgPoolOwnerStats ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPoolOwnerStats) globalForPg.__pgPoolOwnerStats = pool;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(OWNER_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || session.role !== "owner" || !session.ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Perf: scoped SQL COUNT — hindari getBookings() full-scan (semua rows ke memory).
    // ponytail: mock/google-sheets fallback pakai adapter path lama; tambahkan aggregate
    //           method ke DatabaseAdapter kalau butuh driver-agnostic.
    if (process.env.DATABASE_PROVIDER === "postgres") {
      const { rows } = await pool.query(
        `WITH owner_venues AS (
           SELECT id FROM venues WHERE owner_id = $1
         ), owner_courts AS (
           SELECT id, COALESCE(is_active, true) AS is_active FROM courts WHERE venue_id IN (SELECT id FROM owner_venues)
         ), owner_bookings AS (
           SELECT booking_status, payment_status, total_price
           FROM bookings
           WHERE court_id IN (SELECT id FROM owner_courts)
         )
         SELECT
           (SELECT COUNT(*) FROM owner_bookings)::int AS total_bookings,
           (SELECT COUNT(*) FROM owner_bookings WHERE booking_status IN ('waiting_payment','waiting_verification'))::int AS pending_bookings,
           (SELECT COUNT(*) FROM owner_bookings WHERE booking_status = 'confirmed')::int AS confirmed_bookings,
           COALESCE((SELECT SUM(total_price) FROM owner_bookings WHERE payment_status = 'paid'), 0)::float AS total_revenue,
           (SELECT COUNT(*) FROM owner_courts)::int AS total_courts,
           (SELECT COUNT(*) FROM owner_courts WHERE is_active)::int AS active_courts`,
        [String(session.ownerId)]);

      const r = rows[0];
      return NextResponse.json({
        stats: {
          totalBookings: r.total_bookings,
          pendingBookings: r.pending_bookings,
          confirmedBookings: r.confirmed_bookings,
          totalRevenue: r.total_revenue,
          totalCourts: r.total_courts,
          activeCourts: r.active_courts,
        },
      });
    }

    // Fallback: mock / google-sheets — logic lama (full-scan, data kecil jadi aman)
    const adapter = getDatabaseAdapter();
    const venues = await adapter.getVenuesByOwner(session.ownerId);
    const venueIds = new Set(venues.map(v => v.id));
    const allCourts = await adapter.getAllCourts();
    const ownerCourts = allCourts.filter(c => venueIds.has(c.venueId));
    const allBookings = await adapter.getBookings();
    const courtIds = new Set(ownerCourts.map(c => c.id));
    const ownerBookings = allBookings.filter(b => courtIds.has(b.courtId));

    const stats = {
      totalBookings: ownerBookings.length,
      pendingBookings: ownerBookings.filter(b => b.bookingStatus === "waiting_payment" || b.bookingStatus === "waiting_verification").length,
      confirmedBookings: ownerBookings.filter(b => b.bookingStatus === "confirmed").length,
      totalRevenue: ownerBookings.filter(b => b.paymentStatus === "paid").reduce((sum, b) => sum + b.totalPrice, 0),
      totalCourts: ownerCourts.length,
      activeCourts: ownerCourts.filter(c => c.isActive).length,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Owner stats error:", error);
    return NextResponse.json({ error: "Gagal memuat statistik" }, { status: 500 });
  }
}
