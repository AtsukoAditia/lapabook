import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { logAudit } from "@/lib/audit";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

const KNOWN_KEYS = ["platform_fee_default", "settlement_cutoff_hour", "app_name"] as const;

export async function GET() {
  try {
    const { rows } = await pool.query(
      "SELECT key, value, updated_by, updated_at FROM platform_settings ORDER BY key"
    );
    const settings: Record<string, unknown> = {};
    for (const r of rows) settings[r.key] = r.value;
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Admin settings GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil pengaturan" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = body.settings ?? {};
    const keys = Object.keys(updates).filter((k) => (KNOWN_KEYS as readonly string[]).includes(k));
    if (keys.length === 0) {
      return NextResponse.json({ error: "Tidak ada key valid" }, { status: 400 });
    }

    const updatedBy = typeof body.updatedBy === "string" ? body.updatedBy : "admin";

    for (const key of keys) {
      await pool.query(
        `INSERT INTO platform_settings (key, value, updated_by, updated_at)
         VALUES ($1, $2::jsonb, $3, now())
         ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_by = $3, updated_at = now()`,
        [key, JSON.stringify(updates[key]), updatedBy]
      );
    }

    await logAudit(updatedBy, "admin", "update_settings", "platform_settings", keys.join(","), {
      updates: Object.fromEntries(keys.map((k) => [k, updates[k]])),
    });

    return NextResponse.json({ ok: true, updated: keys });
  } catch (error) {
    console.error("Admin settings PUT error:", error);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan" }, { status: 500 });
  }
}
