import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // IDOR fix: wallet detail + members hanya untuk member/owner — saldo & email orang bukan data publik
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { rows } = await pool.query(
      `SELECT tw.*, vo.name as owner_name
       FROM team_wallets tw
       LEFT JOIN customers vo ON vo.id = tw.owner_customer_id
       WHERE tw.id = $1`, [id]);
    if (rows.length === 0) return NextResponse.json({ error: "Wallet tidak ditemukan" }, { status: 404 });

    // Hanya member atau owner yang boleh lihat detail
    const memberCheck = await pool.query(
      `SELECT 1 FROM team_wallet_members WHERE wallet_id = $1 AND customer_id = $2 LIMIT 1`,
      [id, session.userId]);
    if (memberCheck.rows.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await pool.query(
      `SELECT twm.*, c.name as customer_name, c.avatar as customer_avatar
       FROM team_wallet_members twm
       LEFT JOIN customers c ON c.id = twm.customer_id
       WHERE twm.wallet_id = $1`, [id]);

    return NextResponse.json({ success: true, data: { ...rows[0], members: members.rows } });
  } catch (error) {
    console.error("Team wallet GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    // Verify owner
    const w = await pool.query("SELECT owner_customer_id FROM team_wallets WHERE id = $1", [id]);
    if (w.rows[0]?.owner_customer_id !== session.userId) {
      return NextResponse.json({ error: "Hanya owner yang bisa edit" }, { status: 403 });
    }

    const { name, sportType, avatarUrl } = await request.json();
    const fields: string[] = [];
    const p: unknown[] = [];
    if (name) { p.push(name); fields.push(`name = $${p.length}`); }
    if (sportType !== undefined) { p.push(sportType); fields.push(`sport_type = $${p.length}`); }
    if (avatarUrl !== undefined) { p.push(avatarUrl); fields.push(`avatar_url = $${p.length}`); }
    if (fields.length === 0) return NextResponse.json({ error: "Tidak ada data" }, { status: 400 });

    p.push(id);
    const { rows } = await pool.query(
      `UPDATE team_wallets SET ${fields.join(",")}, updated_at = NOW() WHERE id = $${p.length} RETURNING *`, p);
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Team wallet PUT error:", error);
    return NextResponse.json({ error: "Gagal update" }, { status: 500 });
  }
}
