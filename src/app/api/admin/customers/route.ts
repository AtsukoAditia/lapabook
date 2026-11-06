import { NextResponse } from "next/server";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

const SELECT_COLS = `SELECT id, name, email, phone, loyalty_points, total_spent, member_since, created_at, is_active
       FROM customers`;

function toCustomer(r: Record<string, unknown>) {
  const points = (r.loyalty_points as number) || 0;
  let loyaltyTier = "bronze";
  if (points >= 10000) loyaltyTier = "platinum";
  else if (points >= 5000) loyaltyTier = "gold";
  else if (points >= 2000) loyaltyTier = "silver";

  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    loyaltyPoints: points,
    loyaltyTier,
    totalSpent: (r.total_spent as number) || 0,
    memberSince: r.member_since || r.created_at,
    isActive: r.is_active,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pageParam = url.searchParams.get("page");

    // tanpa ?page= → bentuk lama
    if (!pageParam) {
      const { rows } = await pool.query(`${SELECT_COLS} ORDER BY created_at DESC`);
      return NextResponse.json({ customers: rows.map(toCustomer) });
    }

    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));
    const offset = (page - 1) * limit;

    const [rowsRes, countRes] = await Promise.all([
      pool.query(
        `${SELECT_COLS} ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM customers`),
    ]);
    const total = countRes.rows[0]?.total ?? 0;

    return NextResponse.json({
      success: true,
      data: rowsRes.rows.map(toCustomer),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin customers error:", error);
    return NextResponse.json({ error: "Gagal mengambil data pelanggan" }, { status: 500 });
  }
}
