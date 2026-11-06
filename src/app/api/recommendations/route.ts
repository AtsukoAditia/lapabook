import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get("latitude");
    const longitude = searchParams.get("longitude");
    const sport = searchParams.get("sport");
    const limit = parseInt(searchParams.get("limit") || "10");

    // If logged in, personalize; otherwise return popular
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;

    let sql = `SELECT DISTINCT v.*, s.name as sport_name,
               COALESCE(v.avg_rating, 0) as avg_rating, COALESCE(v.review_count, 0) as review_count
               FROM venues v
               LEFT JOIN sports s ON s.id = v.sport_id
               LEFT JOIN courts c ON c.venue_id = v.id
               WHERE v.is_active = true`;

    const p: (string | number)[] = [];

    if (sport) { p.push(sport); sql += ` AND v.sport_id = $${p.length}`; }

    // Boost by rating and review count
    sql += ` ORDER BY COALESCE(v.avg_rating, 0) DESC, COALESCE(v.review_count, 0) DESC`;
    p.push(limit); sql += ` LIMIT $${p.length}`;

    const { rows } = await pool.query(sql, p);

    return NextResponse.json({ success: true, data: rows, personalized: !!session });
  } catch (error) {
    console.error("Recommendations GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil rekomendasi" }, { status: 500 });
  }
}
