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
    const { bookingId, totalAmount, splitType, members } = await request.json();

    if (!totalAmount || !members || members.length === 0) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const splitId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO team_wallet_splits (id, wallet_id, booking_id, total_amount, split_type)
       VALUES ($1,$2,$3,$4,$5)`,
      [splitId, id, bookingId, totalAmount, splitType || "equal"]);

    // Add split members
    for (const m of members) {
      await pool.query(
        `INSERT INTO team_wallet_split_members (id, split_id, customer_id, amount)
         VALUES ($1,$2,$3,$4)`,
        [crypto.randomUUID(), splitId, m.customerId, m.amount]);
    }

    return NextResponse.json({ success: true, data: { splitId } }, { status: 201 });
  } catch (error) {
    console.error("Wallet split error:", error);
    return NextResponse.json({ error: "Gagal split bill" }, { status: 500 });
  }
}
