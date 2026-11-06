import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, ADMIN_TOKEN_NAME } from "@/lib/auth/jwt";
import { getDatabaseAdapter } from "@/lib/adapters";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPoolAdminCommission?: Pool };
const pool = globalForPg.__pgPoolAdminCommission ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPoolAdminCommission) globalForPg.__pgPoolAdminCommission = pool;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await verifyToken(token);
    if (!session || !["admin", "super_admin"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (process.env.DATABASE_PROVIDER === "postgres") {
      const { rows } = await pool.query(
        `SELECT v.id, v.name, v.commission_rate, v.platform_fee_type, v.platform_fee_value,
                COALESCE(b.cnt, 0)::int AS booking_count,
                COALESCE(b.revenue, 0)::float AS total_revenue
         FROM venues v
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS cnt, SUM(total_price) AS revenue
           FROM bookings
           WHERE venue_id = v.id AND booking_status IN ('confirmed','completed')
         ) b ON true
         ORDER BY total_revenue DESC`);

      const venues = rows.map((r) => {
        const rate = r.commission_rate ?? 10;
        const feeType = r.platform_fee_type ?? "percentage";
        const feeValue = r.platform_fee_value ?? 0;
        let totalCommission: number;
        if (feeType === "fixed") {
          totalCommission = r.booking_count * feeValue;
        } else {
          totalCommission = Math.round(r.total_revenue * (rate / 100));
        }
        return {
          venueId: r.id,
          venueName: r.name,
          commissionRate: rate,
          platformFeeType: feeType,
          platformFeeValue: feeValue,
          totalRevenue: r.total_revenue,
          totalCommission,
          ownerPayout: r.total_revenue - totalCommission,
          bookingCount: r.booking_count,
        };
      });

      const totalRevenue = venues.reduce((s, v) => s + v.totalRevenue, 0);
      const totalCommission = venues.reduce((s, v) => s + v.totalCommission, 0);

      return NextResponse.json({
        summary: {
          totalRevenue,
          totalCommission,
          ownerPayout: totalRevenue - totalCommission,
          venueCount: venues.length,
        },
        venues,
      });
    }

    // Fallback mock/sheets
    const adapter = getDatabaseAdapter();
    const [venues, bookings] = await Promise.all([
      adapter.getVenues(),
      adapter.getBookings(),
    ]);

    const confirmed = bookings.filter(
      (b) => b.bookingStatus === "confirmed" || b.bookingStatus === "completed"
    );

    const byVenue = venues.map((v) => {
      const venueBookings = confirmed.filter((b) => b.venueId === v.id);
      const totalRevenue = venueBookings.reduce((s, b) => s + b.totalPrice, 0);
      const rate = v.commissionRate ?? 10;
      const feeType = v.platformFeeType ?? "percentage";
      const feeValue = v.platformFeeValue ?? 0;

      let totalCommission: number;
      if (feeType === "fixed") {
        totalCommission = venueBookings.length * feeValue;
      } else {
        totalCommission = Math.round(totalRevenue * (rate / 100));
      }

      return {
        venueId: v.id,
        venueName: v.name,
        commissionRate: rate,
        platformFeeType: feeType,
        platformFeeValue: feeValue,
        totalRevenue,
        totalCommission,
        ownerPayout: totalRevenue - totalCommission,
        bookingCount: venueBookings.length,
      };
    });

    const totalRevenue = confirmed.reduce((s, b) => s + b.totalPrice, 0);
    const totalCommission = byVenue.reduce((s, v) => s + v.totalCommission, 0);

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalCommission,
        ownerPayout: totalRevenue - totalCommission,
        venueCount: venues.length,
      },
      venues: byVenue,
    });
  } catch (error) {
    console.error("Commission API error:", error);
    return NextResponse.json({ error: "Gagal mengambil data komisi" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await verifyToken(token);
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Hanya super admin" }, { status: 403 });
    }

    const body = await request.json();
    const { venueId, commissionRate, platformFeeType, platformFeeValue } = body;

    if (!venueId) return NextResponse.json({ error: "venueId wajib" }, { status: 400 });

    const adapter = getDatabaseAdapter();
    const config: Record<string, unknown> = {};
    if (commissionRate !== undefined) config.commission_rate = commissionRate;
    if (platformFeeType !== undefined) config.platform_fee_type = platformFeeType;
    if (platformFeeValue !== undefined) config.platform_fee_value = platformFeeValue;

    // ponytail: updateVenueConfig only updates JSONB columns. Direct SQL needed for commission columns.
    const { Pool } = await import("pg");
    const pool = globalThis.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
    if (!globalThis.__pgPool) globalThis.__pgPool = pool;

    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (commissionRate !== undefined) { sets.push(`commission_rate = $${i++}`); vals.push(commissionRate); }
    if (platformFeeType !== undefined) { sets.push(`platform_fee_type = $${i++}`); vals.push(platformFeeType); }
    if (platformFeeValue !== undefined) { sets.push(`platform_fee_value = $${i++}`); vals.push(platformFeeValue); }
    sets.push("updated_at = NOW()");
    vals.push(venueId);

    await pool.query(`UPDATE venues SET ${sets.join(", ")} WHERE id = $${i}`, vals);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Commission update error:", error);
    return NextResponse.json({ error: "Gagal update komisi" }, { status: 500 });
  }
}
