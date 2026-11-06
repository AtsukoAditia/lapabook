import { NextResponse } from "next/server";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.avatar,
              COALESCE(SUM(lt.points), 0) as total_points,
              COUNT(DISTINCT b.id) as total_games
       FROM customers c
       LEFT JOIN loyalty_transactions lt ON lt.customer_id = c.id
       LEFT JOIN bookings b ON b.user_id = c.id AND b.booking_status = 'confirmed'
       GROUP BY c.id, c.name, c.avatar
       HAVING COUNT(DISTINCT b.id) > 0
       ORDER BY total_points DESC, total_games DESC
       LIMIT $1`, [limit]);

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Leaderboard GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil leaderboard" }, { status: 500 });
  }
}
