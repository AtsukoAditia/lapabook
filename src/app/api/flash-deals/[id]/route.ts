import { NextResponse } from "next/server";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { rows } = await pool.query(
      `SELECT fd.*, c.name as court_name, v.name as venue_name, v.address as venue_address,
              v.latitude, v.longitude
       FROM flash_deals fd
       LEFT JOIN courts c ON c.id = fd.court_id
       LEFT JOIN venues v ON v.id = c.venue_id
       WHERE fd.id = $1`, [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Flash deal tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Flash deal GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}
