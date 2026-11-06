import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __cmsPgPool: Pool | undefined;
}

const pool = globalThis.__cmsPgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalThis.__cmsPgPool) globalThis.__cmsPgPool = pool;

export type CmsKey = "tentang" | "syarat" | "kontak" | "kebijakan";
export const CMS_KEYS: readonly CmsKey[] = ["tentang", "syarat", "kontak", "kebijakan"];

export interface CmsRow {
  key: string;
  title: string;
  body: string;
  updatedAt: string;
  updatedBy: string | null;
}

export async function getCmsPage(key: string): Promise<CmsRow | null> {
  const { rows } = await pool.query(
    "SELECT key, title, body, updated_at, updated_by FROM cms_content WHERE key = $1",
    [key],
  );
  if (!rows[0] || !rows[0].body) return null;
  return {
    key: rows[0].key,
    title: rows[0].title,
    body: rows[0].body,
    updatedAt: new Date(rows[0].updated_at).toISOString(),
    updatedBy: rows[0].updated_by,
  };
}

export async function getAllCmsPages(): Promise<Record<string, CmsRow>> {
  const { rows } = await pool.query(
    "SELECT key, title, body, updated_at, updated_by FROM cms_content",
  );
  const result: Record<string, CmsRow> = {};
  for (const r of rows) {
    result[r.key] = {
      key: r.key,
      title: r.title,
      body: r.body,
      updatedAt: new Date(r.updated_at).toISOString(),
      updatedBy: r.updated_by,
    };
  }
  return result;
}

export async function updateCmsPage(
  key: string,
  title: string,
  body: string,
  updatedBy: string,
): Promise<CmsRow> {
  const { rows } = await pool.query(
    `INSERT INTO cms_content (key, title, body, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (key) DO UPDATE
       SET title = $2, body = $3, updated_by = $4, updated_at = NOW()
     RETURNING key, title, body, updated_at, updated_by`,
    [key, title, body, updatedBy],
  );
  return {
    key: rows[0].key,
    title: rows[0].title,
    body: rows[0].body,
    updatedAt: new Date(rows[0].updated_at).toISOString(),
    updatedBy: rows[0].updated_by,
  };
}
