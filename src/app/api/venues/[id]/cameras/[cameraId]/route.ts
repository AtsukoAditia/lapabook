import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, OWNER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; cameraId: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(OWNER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || !["owner", "admin", "super_admin"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cameraId } = await params;
    const { name, cameraType, snapshotUrl, crowdLevel, isPublic, status } = await request.json();

    const fields: string[] = [];
    const p: unknown[] = [];

    if (name !== undefined) { p.push(name); fields.push(`name = $${p.length}`); }
    if (cameraType !== undefined) { p.push(cameraType); fields.push(`camera_type = $${p.length}`); }
    if (snapshotUrl !== undefined) { p.push(snapshotUrl); fields.push(`snapshot_url = $${p.length}`); }
    if (crowdLevel !== undefined) { p.push(crowdLevel); fields.push(`crowd_level = $${p.length}`); }
    if (isPublic !== undefined) { p.push(isPublic); fields.push(`is_public = $${p.length}`); }
    if (status !== undefined) { p.push(status); fields.push(`status = $${p.length}`); }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Tidak ada data yang diupdate" }, { status: 400 });
    }

    p.push(cameraId);
    const { rows } = await pool.query(
      `UPDATE venue_cameras SET ${fields.join(",")}, last_updated = NOW() WHERE id = $${p.length} RETURNING *`, p);

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Camera PUT error:", error);
    return NextResponse.json({ error: "Gagal update kamera" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; cameraId: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(OWNER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || !["owner", "admin", "super_admin"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cameraId } = await params;
    await pool.query("DELETE FROM venue_cameras WHERE id = $1", [cameraId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Camera DELETE error:", error);
    return NextResponse.json({ error: "Gagal menghapus kamera" }, { status: 500 });
  }
}
