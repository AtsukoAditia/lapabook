import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await pool.query(
      "SELECT * FROM pickup_game_participants WHERE pickup_game_id = $1 AND customer_id = $2", [id, session.userId]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Belum join game ini" }, { status: 400 });
    }
    if (existing.rows[0].is_host) {
      return NextResponse.json({ error: "Host tidak bisa keluar. Batalkan game saja." }, { status: 400 });
    }

    await pool.query("DELETE FROM pickup_game_participants WHERE pickup_game_id = $1 AND customer_id = $2", [id, session.userId]);
    await pool.query("UPDATE pickup_games SET current_players = GREATEST(current_players - 1, 1), status = 'open' WHERE id = $1", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Leave pickup game error:", error);
    return NextResponse.json({ error: "Gagal keluar dari pickup game" }, { status: 500 });
  }
}
