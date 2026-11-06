import { NextResponse } from "next/server";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { rows } = await pool.query(
      `SELECT pp.*, cu.name as customer_name, cu.email as customer_email
       FROM pickup_game_participants pp LEFT JOIN customers cu ON cu.id = pp.customer_id
       WHERE pp.pickup_game_id = $1 ORDER BY pp.is_host DESC, pp.joined_at ASC`, [id]);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Participants GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}
