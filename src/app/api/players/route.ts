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
    const sport = searchParams.get("sport");
    const skillLevel = searchParams.get("skill_level");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let sql = `SELECT c.id, c.name, c.avatar, c.phone,
               pp.preferred_position, pp.preferred_sport, pp.skill_level_overall,
               pp.total_games_played, pp.win_rate, pp.bio, pp.is_public,
               pp.play_style, pp.availability
               FROM customers c
               LEFT JOIN player_profiles pp ON pp.customer_id = c.id
               WHERE pp.is_public = true`;
    const p: (string | number)[] = [];

    if (sport) { p.push(sport); sql += ` AND pp.preferred_sport = $${p.length}`; }
    if (skillLevel) { p.push(skillLevel); sql += ` AND pp.skill_level_overall = $${p.length}`; }

    sql += ` ORDER BY pp.total_games_played DESC`;
    p.push(limit); sql += ` LIMIT $${p.length}`;
    p.push(offset); sql += ` OFFSET $${p.length}`;

    const { rows } = await pool.query(sql, p);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Players GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data players" }, { status: 500 });
  }
}
