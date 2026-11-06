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

    // Check deal is still active
    const deal = await pool.query(
      "SELECT * FROM flash_deals WHERE id = $1 AND status = 'active' AND expires_at > NOW()", [id]);
    if (deal.rows.length === 0) {
      return NextResponse.json({ error: "Deal tidak lagi aktif" }, { status: 400 });
    }

    // Check not already claimed
    if (deal.rows[0].claimed_by) {
      return NextResponse.json({ error: "Deal sudah di-claim orang lain" }, { status: 409 });
    }

    // Claim deal
    const { rows } = await pool.query(
      `UPDATE flash_deals SET claimed_by = $1, claimed_at = NOW(), status = 'claimed'
       WHERE id = $2 RETURNING *`, [session.userId, id]);

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Flash deal claim error:", error);
    return NextResponse.json({ error: "Gagal claim deal" }, { status: 500 });
  }
}
