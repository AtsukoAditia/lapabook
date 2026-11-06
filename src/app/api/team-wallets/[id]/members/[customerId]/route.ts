import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; customerId: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, customerId } = await params;
    const { rows: myMember } = await pool.query(
      "SELECT role FROM team_wallet_members WHERE wallet_id = $1 AND customer_id = $2", [id, session.userId]);
    if (!myMember.length || !["owner", "admin"].includes(myMember[0].role)) {
      return NextResponse.json({ error: "Hanya owner/admin yang bisa remove member" }, { status: 403 });
    }

    const { rows: target } = await pool.query(
      "SELECT role FROM team_wallet_members WHERE wallet_id = $1 AND customer_id = $2", [id, customerId]);
    if (target.length > 0 && target[0].role === "owner") {
      return NextResponse.json({ error: "Tidak bisa remove owner" }, { status: 400 });
    }

    await pool.query("DELETE FROM team_wallet_members WHERE wallet_id = $1 AND customer_id = $2", [id, customerId]);
    await pool.query("UPDATE team_wallets SET member_count = GREATEST(member_count - 1, 1) WHERE id = $1", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Member DELETE error:", error);
    return NextResponse.json({ error: "Gagal remove member" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; customerId: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, customerId } = await params;
    const { role } = await request.json();
    if (!role) return NextResponse.json({ error: "role wajib diisi" }, { status: 400 });

    const myRole = await pool.query(
      "SELECT role FROM team_wallet_members WHERE wallet_id = $1 AND customer_id = $2", [id, session.userId]);
    if (!myRole.rows.length || myRole.rows[0].role !== "owner") {
      return NextResponse.json({ error: "Hanya owner yang bisa ubah role" }, { status: 403 });
    }

    const { rows } = await pool.query(
      `UPDATE team_wallet_members SET role = $1 WHERE wallet_id = $2 AND customer_id = $3 RETURNING *`,
      [role, id, customerId]);
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Member PUT error:", error);
    return NextResponse.json({ error: "Gagal update role" }, { status: 500 });
  }
}
