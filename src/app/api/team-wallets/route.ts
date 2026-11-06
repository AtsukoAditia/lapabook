import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = await pool.query(
      `SELECT tw.* FROM team_wallets tw
       WHERE tw.owner_customer_id = $1
       OR tw.id IN (SELECT wallet_id FROM team_wallet_members WHERE customer_id = $1)
       ORDER BY tw.created_at DESC`, [session.userId]);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Team wallets GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, sportType, avatarUrl } = await request.json();
    if (!name) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });

    const id = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO team_wallets (id, owner_customer_id, name, sport_type, avatar_url) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, session.userId, name, sportType, avatarUrl]);

    // Auto-add owner as member
    await pool.query(
      `INSERT INTO team_wallet_members (id, wallet_id, customer_id, role) VALUES ($1,$2,$3,'owner')`,
      [crypto.randomUUID(), id, session.userId]);

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Team wallets POST error:", error);
    return NextResponse.json({ error: "Gagal membuat team wallet" }, { status: 500 });
  }
}
