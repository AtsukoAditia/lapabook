import { Pool } from "pg";

// ponytail: singleton sama seperti postgres-adapter — consolidate ke satu shared pool saat refactor DB layer
// Schema: tabel audit_logs SUDAH ADA di live DB (uuid id, timestamp, action, target_type,
// target_id, actor_type, actor_id, details text, previous_value, new_value).
// Kolom: actor_type=role, target_type=entity type, target_id=entity id.
declare global {
  // eslint-disable-next-line no-var
  var __auditPgPool: Pool | undefined;
}

const pool = globalThis.__auditPgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalThis.__auditPgPool) globalThis.__auditPgPool = pool;

export async function logAudit(
  actorId: string,
  actorRole: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_id, actor_type, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        actorId,
        actorRole,
        action,
        entityType,
        entityId,
        details ? JSON.stringify(details) : "",
      ],
    );
  } catch (error) {
    // Audit log tidak boleh memblokir operasi utama
    console.error("[audit] Gagal mencatat audit log:", error);
  }
}
