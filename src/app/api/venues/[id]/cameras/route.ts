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
      "SELECT * FROM venue_cameras WHERE venue_id = $1 ORDER BY created_at", [id]);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Venue cameras GET error:", error);
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
    const { name, cameraType, snapshotUrl, courtId, isPublic } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Nama kamera wajib diisi" }, { status: 400 });
    }

    const vid = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO venue_cameras (id, venue_id, court_id, name, camera_type, snapshot_url, is_public, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending_approval') RETURNING *`,
      [vid, id, courtId, name, cameraType || "snapshot", snapshotUrl, isPublic !== false]);

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Venue cameras POST error:", error);
    return NextResponse.json({ error: "Gagal menambah kamera" }, { status: 500 });
  }
}
