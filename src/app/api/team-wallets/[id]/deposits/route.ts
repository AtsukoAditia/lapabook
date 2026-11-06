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
      `SELECT twd.*, c.name as from_customer_name
       FROM team_wallet_deposits twd
       LEFT JOIN customers c ON c.id = twd.from_customer_id
       WHERE twd.wallet_id = $1
       ORDER BY twd.created_at DESC`, [id]);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Deposits GET error:", error);
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
    const { amount, paymentMethod, notes } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Jumlah tidak valid" }, { status: 400 });
    }

    const depositId = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO team_wallet_deposits (id, wallet_id, from_customer_id, amount, payment_method, status, notes)
       VALUES ($1,$2,$3,$4,$5,'pending',$6) RETURNING *`,
      [depositId, id, session.userId, amount, paymentMethod, notes]);

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Deposit POST error:", error);
    return NextResponse.json({ error: "Gagal deposit" }, { status: 500 });
  }
}
