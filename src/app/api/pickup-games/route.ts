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
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const skillLevel = searchParams.get("skill_level");

    let sql = `SELECT pg.*, v.name as venue_name, c.name as court_name,
               cu.name as host_name
               FROM pickup_games pg
               LEFT JOIN venues v ON v.id = pg.venue_id
               LEFT JOIN courts c ON c.id = pg.court_id
               LEFT JOIN customers cu ON cu.id = pg.host_customer_id
               WHERE 1=1`;
    const p: (string | number)[] = [];

    if (sport) { p.push(sport); sql += ` AND pg.sport_type = $${p.length}`; }
    if (status) { p.push(status); sql += ` AND pg.status = $${p.length}`; }
    else { sql += ` AND pg.status = 'open'`; }
    if (date) { p.push(date); sql += ` AND DATE(pg.scheduled_at) = $${p.length}`; }
    if (skillLevel) { p.push(skillLevel); sql += ` AND pg.skill_level = $${p.length}`; }

    sql += " ORDER BY pg.scheduled_at ASC";

    const { rows } = await pool.query(sql, p);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Pickup games GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data pickup games" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      courtId, venueId, title, sportType, scheduledAt, durationMinutes,
      maxPlayers, pricePerPerson, totalPrice, description, skillLevel,
      isRecurring, recurringPattern, recurringUntil, locationName, latitude, longitude,
    } = body;

    if (!title || !sportType || !scheduledAt || !maxPlayers || !pricePerPerson) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const splitAmount = totalPrice / maxPlayers;

    const { rows } = await pool.query(
      `INSERT INTO pickup_games (id, court_id, host_customer_id, venue_id, title, sport_type,
       scheduled_at, duration_minutes, max_players, current_players, price_per_person, total_price,
       status, description, skill_level, is_recurring, recurring_pattern, recurring_until,
       location_name, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,$10,$11,'open',$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [id, courtId, session.userId, venueId, title, sportType, scheduledAt,
       durationMinutes || 60, maxPlayers, pricePerPerson, totalPrice, description,
       skillLevel || 'all', isRecurring || false, recurringPattern, recurringUntil,
       locationName, latitude, longitude]
    );

    // Auto-join host as participant
    await pool.query(
      `INSERT INTO pickup_game_participants (id, pickup_game_id, customer_id, split_amount, is_host)
       VALUES ($1,$2,$3,$4,true)`,
      [crypto.randomUUID(), id, session.userId, splitAmount]
    );

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Pickup games POST error:", error);
    return NextResponse.json({ error: "Gagal membuat pickup game" }, { status: 500 });
  }
}
