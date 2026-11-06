import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, OWNER_TOKEN_NAME } from "@/lib/auth/jwt";
import { getDatabaseAdapter } from "@/lib/adapters";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(OWNER_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || session.role !== "owner" || !session.ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adapter = getDatabaseAdapter();
    const venues = await adapter.getVenuesByOwner(session.ownerId);
    return NextResponse.json({ venues });
  } catch (error) {
    console.error("Owner venues GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data venue" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(OWNER_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || session.role !== "owner" || !session.ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, address, areaId, phone, description, facilities, openTime, closeTime, mapsUrl, sports } = body;

    if (!name || !address) {
      return NextResponse.json({ error: "name dan address wajib diisi" }, { status: 400 });
    }
    if (!Array.isArray(sports) || sports.length === 0) {
      return NextResponse.json({ error: "Pilih minimal 1 olahraga" }, { status: 400 });
    }

    const id = `venue-${Date.now()}`;
    const slug = slugify(name);

    await pool.query(
      `INSERT INTO venues (id, name, slug, address, area_id, phone, description, facilities, open_time, close_time, owner_id, approval_status, is_active, maps_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending_review', true, $12)`,
      [id, name, slug, address, areaId || null, phone || null, description || null, facilities ? JSON.stringify(facilities) : null, openTime || null, closeTime || null, session.ownerId, mapsUrl || ""]
    );

    // Auto-create one court per selected sport so the venue isn't stuck without courts.
    // ponytail: default price/surface only; owner edits per-court later via dashboard courts page.
    const adapter = getDatabaseAdapter();
    const allSports = await adapter.getSports();
    for (const sportValue of sports) {
      // UI sends slugs ("futsal"); resolve to real sports.id ("sport-futsal") for the FK.
      const sport = allSports.find((s) => s.slug === sportValue || s.id === sportValue);
      if (!sport) continue;
      const courtId = `court-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const courtSlug = slugify(`${sport.slug}-court-1`);
      await pool.query(
        `INSERT INTO courts (id, venue_id, sport_id, name, slug, surface_type, indoor_type, capacity, base_price, is_active)
         VALUES ($1, $2, $3, $4, $5, '', 'outdoor', 0, 100000, true)
         ON CONFLICT (venue_id, slug) DO NOTHING`,
        [courtId, id, sport.id, `${sport.name} Court 1`, courtSlug]
      );
    }

    return NextResponse.json({ success: true, id, slug }, { status: 201 });
  } catch (error) {
    console.error("Owner venues POST error:", error);
    return NextResponse.json({ error: "Gagal membuat venue" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(OWNER_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || session.role !== "owner" || !session.ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, address, areaId, phone, description, facilities, openTime, closeTime, mapsUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
    }

    // Verify ownership
    const adapter = getDatabaseAdapter();
    const venues = await adapter.getVenuesByOwner(session.ownerId);
    const owned = venues.find((v) => v.id === id);
    if (!owned) {
      return NextResponse.json({ error: "Venue tidak ditemukan atau bukan milik Anda" }, { status: 404 });
    }

    const slug = name ? slugify(name) : undefined;

    await pool.query(
      `UPDATE venues SET
        name = COALESCE($2, name),
        slug = COALESCE($3, slug),
        address = COALESCE($4, address),
        area_id = COALESCE($5, area_id),
        phone = COALESCE($6, phone),
        description = COALESCE($7, description),
        facilities = COALESCE($8, facilities),
        open_time = COALESCE($9, open_time),
        close_time = COALESCE($10, close_time),
        maps_url = COALESCE($11, maps_url),
        updated_at = NOW()
       WHERE id = $1`,
      [id, name || null, slug || null, address || null, areaId || null, phone || null, description || null, facilities ? JSON.stringify(facilities) : null, openTime || null, closeTime || null, mapsUrl || null]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Owner venues PUT error:", error);
    return NextResponse.json({ error: "Gagal mengupdate venue" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(OWNER_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || session.role !== "owner" || !session.ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
    }

    // Verify ownership
    const adapter = getDatabaseAdapter();
    const venues = await adapter.getVenuesByOwner(session.ownerId);
    const owned = venues.find((v) => v.id === id);
    if (!owned) {
      return NextResponse.json({ error: "Venue tidak ditemukan atau bukan milik Anda" }, { status: 404 });
    }

    await pool.query("UPDATE venues SET is_active = false, updated_at = NOW() WHERE id = $1", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Owner venues DELETE error:", error);
    return NextResponse.json({ error: "Gagal menghapus venue" }, { status: 500 });
  }
}
