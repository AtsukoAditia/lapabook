import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, OWNER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPoolOwnerPayouts?: Pool };
const pool = globalForPg.__pgPoolOwnerPayouts ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPoolOwnerPayouts) globalForPg.__pgPoolOwnerPayouts = pool;

// available = SUM owner_payout booking paid milik venue owner MINUS sum payouts approved/paid
async function getBalance(ownerId: string) {
  const { rows } = await pool.query(
    `WITH owner_venues AS (
       SELECT id FROM venues WHERE owner_id = $1
     )
     SELECT
       COALESCE((SELECT SUM(owner_payout) FROM bookings
                 WHERE venue_id IN (SELECT id FROM owner_venues)
                   AND payment_status = 'paid'
                   AND booking_status IN ('confirmed', 'completed')), 0)::float AS earned,
       COALESCE((SELECT SUM(amount) FROM payouts
                 WHERE owner_id = $1 AND status IN ('approved', 'paid')), 0)::float AS settled,
       COALESCE((SELECT SUM(amount) FROM payouts
                 WHERE owner_id = $1 AND status = 'requested'), 0)::float AS pending`,
    [ownerId]);
  const r = rows[0];
  const earned = Number(r.earned);
  const settled = Number(r.settled);
  return { earned, settled, pending: Number(r.pending), available: earned - settled };
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(OWNER_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await verifyToken(token);
    if (!session || session.role !== "owner" || !session.ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (process.env.DATABASE_PROVIDER !== "postgres") {
      return NextResponse.json({ error: "Hanya didukung di postgres" }, { status: 501 });
    }

    const ownerId = String(session.ownerId);
    const balance = await getBalance(ownerId);
    const { rows } = await pool.query(
      `SELECT id, venue_id, amount, status, note, requested_at, decided_at
       FROM payouts WHERE owner_id = $1 ORDER BY requested_at DESC LIMIT 100`,
      [ownerId]);
    return NextResponse.json({
      balance,
      payouts: rows.map((r) => ({
        id: r.id, venueId: r.venue_id, amount: Number(r.amount),
        status: r.status, note: r.note,
        requestedAt: r.requested_at, decidedAt: r.decided_at,
      })),
    });
  } catch (error) {
    console.error("Owner payouts error:", error);
    return NextResponse.json({ error: "Gagal memuat payout" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(OWNER_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await verifyToken(token);
    if (!session || session.role !== "owner" || !session.ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (process.env.DATABASE_PROVIDER !== "postgres") {
      return NextResponse.json({ error: "Hanya didukung di postgres" }, { status: 501 });
    }

    const ownerId = String(session.ownerId);
    const body = await request.json();
    const amount = Math.round(Number(body?.amount));
    const venueId = body?.venueId ? String(body.venueId) : null;
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });
    }
    // venue milik owner (kalau diisi)
    if (venueId) {
      const { rows } = await pool.query(
        "SELECT id FROM venues WHERE id = $1 AND owner_id = $2", [venueId, ownerId]);
      if (rows.length === 0) return NextResponse.json({ error: "Venue bukan milik Anda" }, { status: 403 });
    }

    const balance = await getBalance(ownerId);
    if (amount > balance.available) {
      return NextResponse.json({ error: "Nominal melebihi saldo tersedia" }, { status: 400 });
    }

    const id = `po-${crypto.randomUUID().slice(0, 8)}`;
    await pool.query(
      `INSERT INTO payouts (id, owner_id, venue_id, amount, status)
       VALUES ($1, $2, $3, $4, 'requested')`,
      [id, ownerId, venueId, amount]);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    console.error("Owner payout request error:", error);
    return NextResponse.json({ error: "Gagal mengajukan penarikan" }, { status: 500 });
  }
}
