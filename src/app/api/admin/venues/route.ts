import { NextResponse } from "next/server";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pageParam = url.searchParams.get("page");

    // tanpa ?page= → bentuk lama
    if (!pageParam) {
      const { rows: venues } = await pool.query(
        `SELECT v.*, vo.business_name, vo.pic_name
         FROM venues v
         LEFT JOIN venue_owners vo ON vo.id = v.owner_id
         WHERE v.approval_status = 'pending_review'
         ORDER BY v.created_at DESC`,
      );
      return NextResponse.json({ venues });
    }

    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));
    const offset = (page - 1) * limit;

    const [rowsRes, countRes] = await Promise.all([
      pool.query(
        `SELECT v.*, vo.business_name, vo.pic_name
         FROM venues v
         LEFT JOIN venue_owners vo ON vo.id = v.owner_id
         WHERE v.approval_status = 'pending_review'
         ORDER BY v.created_at DESC, v.id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total FROM venues WHERE approval_status = 'pending_review'`
      ),
    ]);
    const total = countRes.rows[0]?.total ?? 0;

    return NextResponse.json({
      success: true,
      data: rowsRes.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin venues GET error:", error);
    return NextResponse.json({ error: "Gagal memuat data venue" }, { status: 500 });
  }
}
