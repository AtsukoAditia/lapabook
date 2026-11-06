import { NextResponse } from "next/server";
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

    // Get owner's venues
    const venues = await adapter.getVenuesByOwner(session.ownerId);
    const venueIds = new Set(venues.map(v => v.id));

    // Get all courts and filter by owner's venues
    const allCourts = await adapter.getAllCourts();
    const ownerCourts = allCourts.filter(c => venueIds.has(c.venueId));

    return NextResponse.json({ courts: ownerCourts });
  } catch (error) {
    console.error("Owner courts GET error:", error);
    return NextResponse.json({ error: "Gagal memuat data lapangan" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(OWNER_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || session.role !== "owner" || !session.ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { venueId, sportId, name, surfaceType, indoorType, capacity, basePrice } = body;

    if (!venueId || !sportId || !name || typeof basePrice !== "number" || basePrice < 0) {
      return NextResponse.json({ error: "venueId, sportId, name, basePrice wajib diisi" }, { status: 400 });
    }
    if (indoorType && !["indoor", "outdoor", "semi_outdoor"].includes(indoorType)) {
      return NextResponse.json({ error: "indoorType tidak valid" }, { status: 400 });
    }

    const adapter = getDatabaseAdapter();

    // Verify venue belongs to owner
    const venues = await adapter.getVenuesByOwner(session.ownerId);
    if (!venues.some((v) => v.id === venueId)) {
      return NextResponse.json({ error: "Venue tidak ditemukan atau bukan milik Anda" }, { status: 404 });
    }

    const id = `court-${Date.now()}`;
    const slug = slugify(String(name)) || id;

    try {
      await pool.query(
        `INSERT INTO courts (id, venue_id, sport_id, name, slug, surface_type, indoor_type, capacity, base_price, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
        [id, venueId, sportId, name, slug, surfaceType || "", indoorType || "outdoor", capacity ?? 0, Math.round(basePrice)]
      );
    } catch (e) {
      if ((e as { code?: string }).code === "23505") {
        return NextResponse.json({ error: "Slug lapangan sudah dipakai di venue ini" }, { status: 409 });
      }
      throw e;
    }

    const court = await adapter.getCourtById(id);
    return NextResponse.json({ court }, { status: 201 });
  } catch (error) {
    console.error("Owner courts POST error:", error);
    return NextResponse.json({ error: "Gagal membuat lapangan" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(OWNER_TOKEN_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || session.role !== "owner" || !session.ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { courtId, isActive } = body;

    if (!courtId || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const adapter = getDatabaseAdapter();

    // Verify court belongs to owner
    const venues = await adapter.getVenuesByOwner(session.ownerId);
    const venueIds = new Set(venues.map(v => v.id));

    const allCourts = await adapter.getAllCourts();
    const court = allCourts.find(c => c.id === courtId);

    if (!court || !venueIds.has(court.venueId)) {
      return NextResponse.json({ error: "Lapangan tidak ditemukan" }, { status: 404 });
    }

    // Update court
    const updatedCourt = await adapter.updateCourt(courtId, { isActive });

    return NextResponse.json({ court: updatedCourt });
  } catch (error) {
    console.error("Owner courts PATCH error:", error);
    return NextResponse.json({ error: "Gagal mengupdate lapangan" }, { status: 500 });
  }
}
