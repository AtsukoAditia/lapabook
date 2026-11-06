import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Check game exists and is open
    const game = await pool.query("SELECT * FROM pickup_games WHERE id = $1", [id]);
    if (game.rows.length === 0) return NextResponse.json({ error: "Game tidak ditemukan" }, { status: 404 });
    const g = game.rows[0];
    if (g.status !== "open") return NextResponse.json({ error: "Game sudah tidak open" }, { status: 400 });
    if (g.current_players >= g.max_players) return NextResponse.json({ error: "Game sudah penuh" }, { status: 400 });

    // Check not already joined
    const exists = await pool.query(
      "SELECT id FROM pickup_game_participants WHERE pickup_game_id = $1 AND customer_id = $2", [id, session.userId]);
    if (exists.rows.length > 0) return NextResponse.json({ error: "Sudah join game ini" }, { status: 400 });

    const splitAmount = parseFloat(g.total_price) / g.max_players;

    const { rows } = await pool.query(
      `INSERT INTO pickup_game_participants (id, pickup_game_id, customer_id, split_amount, skill_level, is_host)
       VALUES ($1,$2,$3,$4,$5,false) RETURNING *`,
      [crypto.randomUUID(), id, session.userId, splitAmount, body.skillLevel]
    );

    await pool.query("UPDATE pickup_games SET current_players = current_players + 1 WHERE id = $1", [id]);

    // Check if full
    const updated = await pool.query("SELECT current_players, max_players FROM pickup_games WHERE id = $1", [id]);
    if (updated.rows[0].current_players >= updated.rows[0].max_players) {
      await pool.query("UPDATE pickup_games SET status = 'full' WHERE id = $1", [id]);
    }

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Join pickup game error:", error);
    return NextResponse.json({ error: "Gagal join pickup game" }, { status: 500 });
  }
}
