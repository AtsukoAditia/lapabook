import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!["accepted", "declined"].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    // Verify target
    const existing = await pool.query(
      "SELECT target_customer_id FROM match_requests WHERE id = $1", [id]);
    if (existing.rows[0]?.target_customer_id !== session.userId) {
      return NextResponse.json({ error: "Hanya target yang bisa merespon" }, { status: 403 });
    }

    const { rows } = await pool.query(
      `UPDATE match_requests SET status = $1, responded_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]);

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Match request PUT error:", error);
    return NextResponse.json({ error: "Gagal merespon" }, { status: 500 });
  }
}
