import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function POST(request: Request, { params }: { params: Promise<{ id: string; depositId: string }> }) {
  const client = await pool.connect();
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: walletId, depositId } = await params;

    // Only wallet owner or super_admin may confirm
    const wallet = await pool.query(
      `SELECT owner_customer_id FROM team_wallets WHERE id = $1`, [walletId]);
    if (wallet.rows.length === 0) {
      return NextResponse.json({ error: "Wallet tidak ditemukan" }, { status: 404 });
    }
    const isOwner = wallet.rows[0].owner_customer_id === session.userId;
    const role = session.role as string;
    if (!isOwner && role !== "super_admin") {
      return NextResponse.json({ error: "Hanya owner yang bisa konfirmasi deposit" }, { status: 403 });
    }

    await client.query("BEGIN");

    // Atomic: only flip pending → confirmed; 409 if already confirmed
    const { rows } = await client.query(
      `UPDATE team_wallet_deposits
       SET status = 'confirmed', confirmed_at = NOW()
       WHERE id = $1 AND wallet_id = $2 AND status = 'pending'
       RETURNING *`,
      [depositId, walletId]);

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      const existing = await pool.query(
        `SELECT status FROM team_wallet_deposits WHERE id = $1 AND wallet_id = $2`,
        [depositId, walletId]);
      if (existing.rows.length === 0) {
        return NextResponse.json({ error: "Deposit tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json({ error: "Deposit sudah dikonfirmasi" }, { status: 409 });
    }

    const deposit = rows[0];

    // Credit wallet balance
    await client.query(
      `UPDATE team_wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
      [deposit.amount, walletId]);

    // Ledger entry
    await client.query(
      `INSERT INTO team_wallet_transactions (id, wallet_id, type, amount, description, reference_id, customer_id)
       VALUES ($1, $2, 'deposit', $3, $4, $5, $6)`,
      [crypto.randomUUID(), walletId, deposit.amount, "Deposit confirmed", depositId, deposit.from_customer_id]);

    await client.query("COMMIT");
    return NextResponse.json({ success: true, data: deposit });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Deposit confirm error:", error);
    return NextResponse.json({ error: "Gagal konfirmasi deposit" }, { status: 500 });
  } finally {
    client.release();
  }
}
