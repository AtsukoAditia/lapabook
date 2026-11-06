import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { logAudit } from "@/lib/audit";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const action = body.action as string;

    if (action !== "ban" && action !== "unban") {
      return NextResponse.json({ error: "Action harus ban atau unban" }, { status: 400 });
    }

    const isActive = action === "unban";
    const { rows } = await pool.query(
      "UPDATE customers SET is_active = $1, updated_at = now() WHERE id = $2 RETURNING id, name, is_active",
      [isActive, id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Customer tidak ditemukan" }, { status: 404 });
    }

    await logAudit("admin", "admin", `customer_${action}`, "customers", id, {
      customer_name: rows[0].name,
      is_active: isActive,
    });

    return NextResponse.json({ ok: true, customer: rows[0] });
  } catch (error) {
    console.error("Admin customer PATCH error:", error);
    return NextResponse.json({ error: "Gagal update status customer" }, { status: 500 });
  }
}
