import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; splitId: string }> }) {
  const client = await pool.connect();
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: walletId, splitId } = await params;

    // Owner wallet only
    const wallet = await pool.query(
      `SELECT owner_customer_id FROM team_wallets WHERE id = $1`, [walletId]);
    if (wallet.rows.length === 0) {
      return NextResponse.json({ error: "Wallet tidak ditemukan" }, { status: 404 });
    }
    if (wallet.rows[0].owner_customer_id !== session.userId) {
      return NextResponse.json({ error: "Hanya owner yang bisa update split" }, { status: 403 });
    }

    const body = await request.json();
    const { action, customerId } = body ?? {};
    if (action !== "mark_paid" || !customerId) {
      return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
    }

    await client.query("BEGIN");

    const { rows } = await client.query(
      `UPDATE team_wallet_split_members sm
       SET status = 'paid', paid_at = NOW()
       FROM team_wallet_splits s
       WHERE sm.split_id = s.id
         AND s.id = $1
         AND s.wallet_id = $2
         AND sm.customer_id = $3
         AND sm.status = 'pending'
       RETURNING sm.*`,
      [splitId, walletId, customerId]);

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      const splitCheck = await pool.query(
        `SELECT 1 FROM team_wallet_splits WHERE id = $1 AND wallet_id = $2`,
        [splitId, walletId]);
      if (splitCheck.rows.length === 0) {
        return NextResponse.json({ error: "Split tidak ditemukan" }, { status: 404 });
      }
      const memberCheck = await pool.query(
        `SELECT status FROM team_wallet_split_members WHERE split_id = $1 AND customer_id = $2`,
        [splitId, customerId]);
      if (memberCheck.rows.length === 0) {
        return NextResponse.json({ error: "Member split tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json({ error: "Member sudah dibayar" }, { status: 409 });
    }

    // Auto-complete parent split when all members paid
    const remaining = await client.query(
      `SELECT COUNT(*)::int AS n FROM team_wallet_split_members WHERE split_id = $1 AND status <> 'paid'`,
      [splitId]);
    if (remaining.rows[0].n === 0) {
      await client.query(
        `UPDATE team_wallet_splits SET status = 'completed' WHERE id = $1`,
        [splitId]);
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Split member PATCH error:", error);
    return NextResponse.json({ error: "Gagal update split" }, { status: 500 });
  } finally {
    client.release();
  }
}
