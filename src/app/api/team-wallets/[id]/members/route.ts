import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // IDOR fix: list members (+email) hanya untuk sesama member
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const check = await pool.query(
      `SELECT 1 FROM team_wallet_members WHERE wallet_id = $1 AND customer_id = $2 LIMIT 1`,
      [id, session.userId]);
    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { rows } = await pool.query(
      `SELECT twm.*, cu.name as customer_name, cu.email as customer_email
       FROM team_wallet_members twm LEFT JOIN customers cu ON cu.id = twm.customer_id
       WHERE twm.wallet_id = $1 ORDER BY twm.role, twm.joined_at`, [id]);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Members GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { customerId, role } = await request.json();
    if (!customerId) return NextResponse.json({ error: "customerId wajib diisi" }, { status: 400 });

    // Check owner/admin
    const member = await pool.query(
      "SELECT role FROM team_wallet_members WHERE wallet_id = $1 AND customer_id = $2", [id, session.userId]);
    if (!member.rows.length || !["owner", "admin"].includes(member.rows[0].role)) {
      return NextResponse.json({ error: "Hanya owner/admin yang bisa invite" }, { status: 403 });
    }

    const { rows } = await pool.query(
      `INSERT INTO team_wallet_members (id, wallet_id, customer_id, role) VALUES ($1,$2,$3,$4) RETURNING *`,
      [crypto.randomUUID(), id, customerId, role || "member"]);
    await pool.query("UPDATE team_wallets SET member_count = member_count + 1 WHERE id = $1", [id]);

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Member sudah ada" }, { status: 409 });
    }
    console.error("Members POST error:", error);
    return NextResponse.json({ error: "Gagal menambahkan member" }, { status: 500 });
  }
}
