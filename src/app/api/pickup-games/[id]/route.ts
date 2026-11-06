import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { rows } = await pool.query(
      `SELECT pg.*, v.name as venue_name, c.name as court_name, cu.name as host_name
       FROM pickup_games pg
       LEFT JOIN venues v ON v.id = pg.venue_id
       LEFT JOIN courts c ON c.id = pg.court_id
       LEFT JOIN customers cu ON cu.id = pg.host_customer_id
       WHERE pg.id = $1`, [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Pickup game tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Pickup game GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const fields: string[] = [];
    const p: unknown[] = [];

    const updatable = ["title", "scheduled_at", "duration_minutes", "max_players", "price_per_person",
      "total_price", "status", "description", "skill_level"] as const;
    const camelToSnake: Record<string, string> = {
      scheduledAt: "scheduled_at", durationMinutes: "duration_minutes",
      maxPlayers: "max_players", pricePerPerson: "price_per_person",
      totalPrice: "total_price", skillLevel: "skill_level",
    };

    for (const key of Object.keys(body)) {
      const snake = camelToSnake[key] || key;
      if (updatable.includes(snake as typeof updatable[number])) {
        p.push(body[key]);
        fields.push(`${snake} = $${p.length}`);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Tidak ada data yang diupdate" }, { status: 400 });
    }

    // Verify host
    const existing = await pool.query("SELECT host_customer_id FROM pickup_games WHERE id = $1", [id]);
    if (existing.rows[0]?.host_customer_id !== session.userId) {
      return NextResponse.json({ error: "Hanya host yang bisa mengedit" }, { status: 403 });
    }

    p.push(id);
    const { rows } = await pool.query(
      `UPDATE pickup_games SET ${fields.join(",")}, updated_at = NOW() WHERE id = $${p.length} RETURNING *`, p);

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Pickup game PUT error:", error);
    return NextResponse.json({ error: "Gagal mengupdate pickup game" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await pool.query("SELECT host_customer_id FROM pickup_games WHERE id = $1", [id]);
    if (existing.rows[0]?.host_customer_id !== session.userId) {
      return NextResponse.json({ error: "Hanya host yang bisa membatalkan" }, { status: 403 });
    }

    await pool.query("UPDATE pickup_games SET status = 'cancelled' WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pickup game DELETE error:", error);
    return NextResponse.json({ error: "Gagal membatalkan pickup game" }, { status: 500 });
  }
}
