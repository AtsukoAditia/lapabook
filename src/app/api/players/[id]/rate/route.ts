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
    const { skillScore, attitudeScore, punctualityScore, reviewText, pickupGameId } = await request.json();

    if (!skillScore || !attitudeScore || !punctualityScore) {
      return NextResponse.json({ error: "Skor wajib diisi" }, { status: 400 });
    }

    const ratingId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO player_skill_ratings (id, customer_id, rated_by_customer_id, pickup_game_id,
       skill_score, attitude_score, punctuality_score, review_text)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (customer_id, pickup_game_id, rated_by_customer_id) DO UPDATE SET
       skill_score=$5, attitude_score=$6, punctuality_score=$7, review_text=$8`,
      [ratingId, id, session.userId, pickupGameId,
       skillScore, attitudeScore, punctualityScore, reviewText]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Player rate error:", error);
    return NextResponse.json({ error: "Gagal memberikan rating" }, { status: 500 });
  }
}
