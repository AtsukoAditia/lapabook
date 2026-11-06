import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = await pool.query(
      `SELECT mr.*, 
              req.name as requester_name, req.avatar as requester_avatar,
              tgt.name as target_name, tgt.avatar as target_avatar
       FROM match_requests mr
       LEFT JOIN customers req ON req.id = mr.requester_id
       LEFT JOIN customers tgt ON tgt.id = mr.target_customer_id
       WHERE mr.requester_id = $1 OR mr.target_customer_id = $1
       ORDER BY mr.created_at DESC`, [session.userId]);

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Match requests GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetCustomerId, sportType, proposedDate, proposedLocation, message } = await request.json();
    if (!targetCustomerId) {
      return NextResponse.json({ error: "Target player wajib diisi" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO match_requests (id, requester_id, target_customer_id, sport_type, proposed_date, proposed_location, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, session.userId, targetCustomerId, sportType, proposedDate, proposedLocation, message]);

    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error) {
    console.error("Match requests POST error:", error);
    return NextResponse.json({ error: "Gagal mengirim request" }, { status: 500 });
  }
}
