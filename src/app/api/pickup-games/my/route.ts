import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = await pool.query(
      `SELECT DISTINCT pg.*, v.name as venue_name FROM pickup_games pg
       LEFT JOIN venues v ON v.id = pg.venue_id
       WHERE pg.host_customer_id = $1
       OR pg.id IN (SELECT pickup_game_id FROM pickup_game_participants WHERE customer_id = $1)
       ORDER BY pg.scheduled_at DESC`, [session.userId]);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("My pickup games GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}
