import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { rows } = await pool.query(
      `SELECT twt.*, c.name as customer_name
       FROM team_wallet_transactions twt
       LEFT JOIN customers c ON c.id = twt.customer_id
       WHERE twt.wallet_id = $1
       ORDER BY twt.created_at DESC`, [id]);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Transactions GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}
