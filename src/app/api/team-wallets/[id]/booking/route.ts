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
    const { bookingId, amount } = await request.json();

    if (!bookingId || !amount) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Check wallet balance
    const wallet = await pool.query("SELECT balance FROM team_wallets WHERE id = $1", [id]);
    if (wallet.rows.length === 0 || parseFloat(wallet.rows[0].balance) < amount) {
      return NextResponse.json({ error: "Saldo tidak cukup" }, { status: 400 });
    }

    // Create transaction
    const txId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO team_wallet_transactions (id, wallet_id, type, amount, description, reference_id, customer_id)
       VALUES ($1,$2,'booking_payment',$3,'Pembayaran booking',$4,$5)`,
      [txId, id, amount, bookingId, session.userId]);

    // Deduct balance
    await pool.query(
      "UPDATE team_wallets SET balance = balance - $1, total_spent = total_spent + $1, updated_at = NOW() WHERE id = $2",
      [amount, id]);

    return NextResponse.json({ success: true, data: { transactionId: txId } });
  } catch (error) {
    console.error("Wallet pay error:", error);
    return NextResponse.json({ error: "Gagal bayar dari wallet" }, { status: 500 });
  }
}
