import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, ADMIN_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPoolAdminPayouts?: Pool };
const pool = globalForPg.__pgPoolAdminPayouts ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPoolAdminPayouts) globalForPg.__pgPoolAdminPayouts = pool;

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_TOKEN_NAME)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session || !["admin", "super_admin"].includes(session.role)) return null;
  return session;
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (process.env.DATABASE_PROVIDER !== "postgres") {
      return NextResponse.json({ error: "Hanya didukung di postgres" }, { status: 501 });
    }
    const { rows } = await pool.query(
      `SELECT p.id, p.owner_id, o.business_name AS owner_name, p.venue_id, v.name AS venue_name,
              p.amount, p.status, p.note, p.requested_at, p.decided_at
       FROM payouts p
       LEFT JOIN venue_owners o ON o.id = p.owner_id
       LEFT JOIN venues v ON v.id = p.venue_id
       ORDER BY p.requested_at DESC LIMIT 200`);
    return NextResponse.json({
      payouts: rows.map((r) => ({
        id: r.id, ownerId: r.owner_id, ownerName: r.owner_name,
        venueId: r.venue_id, venueName: r.venue_name,
        amount: Number(r.amount), status: r.status, note: r.note,
        requestedAt: r.requested_at, decidedAt: r.decided_at,
      })),
    });
  } catch (error) {
    console.error("Admin payouts error:", error);
    return NextResponse.json({ error: "Gagal memuat payout" }, { status: 500 });
  }
}

// body: { id, action: "approve" | "reject" | "paid", note? }
export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json();
    const id = String(body?.id ?? "");
    const action = String(body?.action ?? "");
    const note = body?.note ? String(body.note).slice(0, 500) : "";
    const next: Record<string, string> = { approve: "approved", reject: "rejected", paid: "paid" };
    if (!id || !next[action]) {
      return NextResponse.json({ error: "id + action (approve/reject/paid) wajib" }, { status: 400 });
    }
    const { rowCount } = await pool.query(
      `UPDATE payouts SET status = $1, note = $2, decided_at = NOW(), decided_by = $3
       WHERE id = $4 AND status = 'requested'`,
      [next[action], note, String(session.userId ?? session.email ?? "admin"), id]);
    if (rowCount === 0) {
      return NextResponse.json({ error: "Payout tidak ditemukan / sudah diputuskan" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin payout decide error:", error);
    return NextResponse.json({ error: "Gagal memproses payout" }, { status: 500 });
  }
}
