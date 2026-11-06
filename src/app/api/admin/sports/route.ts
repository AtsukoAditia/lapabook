import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, ADMIN_TOKEN_NAME } from "@/lib/auth/jwt";
import { getDatabaseAdapter } from "@/lib/adapters";

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_TOKEN_NAME)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session || (session.role !== "admin" && session.role !== "super_admin" && session.role !== "staff")) return null;
  return session;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const adapter = getDatabaseAdapter();
    const sports = await adapter.getAllSports();
    return NextResponse.json({ sports });
  } catch (e) {
    console.error("Admin sports GET error:", e);
    return NextResponse.json({ error: "Gagal mengambil data olahraga" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const slug = String(body.slug ?? "").trim().toLowerCase();
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
    if (!name || !slug) return NextResponse.json({ error: "name dan slug wajib diisi" }, { status: 400 });
    if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: "slug hanya boleh huruf kecil, angka, dan -" }, { status: 400 });
    const adapter = getDatabaseAdapter();
    const sport = await adapter.createSport({ name, slug, isActive });
    return NextResponse.json({ sport }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal membuat olahraga";
    const status = msg.includes("duplicate") || msg.includes("unique") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
    const input: { name?: string; slug?: string; isActive?: boolean } = {};
    if (body.name !== undefined) input.name = String(body.name).trim();
    if (body.slug !== undefined) {
      const s = String(body.slug).trim().toLowerCase();
      if (!/^[a-z0-9-]+$/.test(s)) return NextResponse.json({ error: "slug tidak valid" }, { status: 400 });
      input.slug = s;
    }
    if (body.isActive !== undefined) input.isActive = Boolean(body.isActive);
    const adapter = getDatabaseAdapter();
    const sport = await adapter.updateSport(id, input);
    return NextResponse.json({ sport });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal update olahraga";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") ?? "";
    if (!id) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
    const adapter = getDatabaseAdapter();
    await adapter.deleteSport(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal hapus olahraga";
    const status = msg.includes("masih ada lapangan") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
