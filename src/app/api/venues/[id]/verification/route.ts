import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, OWNER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { rows } = await pool.query(
      "SELECT * FROM venue_verifications WHERE venue_id = $1", [id]);
    return NextResponse.json({ success: true, data: rows[0] || null });
  } catch (error) {
    console.error("Verification GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(OWNER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || !["owner", "admin", "super_admin"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check owner owns this venue
    const venue = await pool.query(
      "SELECT owner_id FROM venues WHERE id = $1", [id]);
    if (venue.rows.length === 0) {
      return NextResponse.json({ error: "Venue tidak ditemukan" }, { status: 404 });
    }
    if (session.role === "owner" && venue.rows[0].owner_id !== session.userId) {
      return NextResponse.json({ error: "Venue bukan milik Anda" }, { status: 403 });
    }

    const vid = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO venue_verifications (id, venue_id, requested_by, status)
       VALUES ($1,$2,$3,'pending') RETURNING *`,
      [vid, id, session.userId]);

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Verification POST error:", error);
    return NextResponse.json({ error: "Gagal request verifikasi" }, { status: 500 });
  }
}
