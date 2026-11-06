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
    const status = searchParams.get("status") || "active";
    const courtId = searchParams.get("court_id");
    const date = searchParams.get("date");

    let sql = `SELECT fd.*, c.name as court_name, v.name as venue_name, v.address as venue_address
               FROM flash_deals fd
               LEFT JOIN courts c ON c.id = fd.court_id
               LEFT JOIN venues v ON v.id = c.venue_id
               WHERE fd.status = $1 AND fd.expires_at > NOW()`;
    const p: (string | number)[] = [status];

    if (courtId) { p.push(courtId); sql += ` AND fd.court_id = $${p.length}`; }
    if (date) { p.push(date); sql += ` AND fd.slot_date = $${p.length}`; }

    sql += " ORDER BY fd.expires_at ASC";

    const { rows } = await pool.query(sql, p);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Flash deals GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || !["admin", "super_admin", "owner"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { courtId, slotDate, startTime, endTime, originalPrice, discountPercent, minPlayers, maxPlayers, dealType, startsAt, expiresAt } = body;

    if (!courtId || !slotDate || !startTime || !endTime || !discountPercent) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const dealPrice = originalPrice * (1 - discountPercent / 100);
    const id = crypto.randomUUID();

    const { rows } = await pool.query(
      `INSERT INTO flash_deals (id, court_id, slot_date, start_time, end_time, original_price, deal_price,
       discount_percent, min_players, max_players, status, deal_type, starts_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11,$12,$13) RETURNING *`,
      [id, courtId, slotDate, startTime, endTime, originalPrice, dealPrice,
       discountPercent, minPlayers || 1, maxPlayers, dealType || "last_minute", startsAt, expiresAt]);

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Flash deals POST error:", error);
    return NextResponse.json({ error: "Gagal membuat flash deal" }, { status: 500 });
  }
}
