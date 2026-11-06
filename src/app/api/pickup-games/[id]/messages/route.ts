import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { rows } = await pool.query(
      `SELECT pm.*, cu.name as sender_name FROM pickup_game_messages pm
       LEFT JOIN customers cu ON cu.id = pm.sender_id WHERE pm.pickup_game_id = $1 ORDER BY pm.created_at ASC`, [id]);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Messages GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil pesan" }, { status: 500 });
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
    const { message } = await request.json();
    if (!message) return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });

    // Verify participant
    const part = await pool.query(
      "SELECT id FROM pickup_game_participants WHERE pickup_game_id = $1 AND customer_id = $2", [id, session.userId]);
    if (part.rows.length === 0) {
      return NextResponse.json({ error: "Hanya peserta yang bisa mengirim pesan" }, { status: 403 });
    }

    const { rows } = await pool.query(
      `INSERT INTO pickup_game_messages (id, pickup_game_id, sender_id, message) VALUES ($1,$2,$3,$4) RETURNING *`,
      [crypto.randomUUID(), id, session.userId, message]);

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Messages POST error:", error);
    return NextResponse.json({ error: "Gagal mengirim pesan" }, { status: 500 });
  }
}
