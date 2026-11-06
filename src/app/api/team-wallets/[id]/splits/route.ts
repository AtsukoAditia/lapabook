import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // IDOR: only wallet members may view splits
    const memberCheck = await pool.query(
      `SELECT 1 FROM team_wallet_members WHERE wallet_id = $1 AND customer_id = $2 LIMIT 1`,
      [id, session.userId]);
    if (memberCheck.rows.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { rows } = await pool.query(
      `SELECT s.id,
              s.total_amount as "totalAmount",
              s.split_type as "splitType",
              s.status,
              s.created_at as "createdAt",
              s.booking_id as "bookingId",
              COALESCE(json_agg(json_build_object(
                'customerId', m.customer_id,
                'customerName', c.name,
                'amount', m.amount,
                'status', m.status,
                'paidAt', m.paid_at
              )) FILTER (WHERE m.id IS NOT NULL), '[]') as members
       FROM team_wallet_splits s
       LEFT JOIN team_wallet_split_members m ON m.split_id = s.id
       LEFT JOIN customers c ON c.id = m.customer_id
       WHERE s.wallet_id = $1
       GROUP BY s.id
       ORDER BY s.created_at DESC
       LIMIT 100`,
      [id]);

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Splits GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}
