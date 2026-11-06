import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, ADMIN_TOKEN_NAME } from "@/lib/auth/jwt";
import { getAllCmsPages, updateCmsPage, CMS_KEYS } from "@/lib/cms";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_TOKEN_NAME)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session || !["admin", "super_admin"].includes(session.role)) return null;
  return session;
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pages = await getAllCmsPages();
    return NextResponse.json({ success: true, data: pages });
  } catch (error) {
    console.error("CMS GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { key, title, body: pageBody } = body;

    if (!key || !(CMS_KEYS as readonly string[]).includes(key)) {
      return NextResponse.json({ error: `Key harus salah satu dari: ${CMS_KEYS.join(", ")}` }, { status: 400 });
    }

    const updated = await updateCmsPage(
      key,
      typeof title === "string" ? title : "",
      typeof pageBody === "string" ? pageBody : "",
      session.email || session.userId || "admin",
    );

    logAudit(
      session.userId || session.email || "admin",
      session.role,
      "update_cms",
      "cms_content",
      key,
      { title: updated.title },
    ).catch(() => {});

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("CMS PUT error:", error);
    return NextResponse.json({ error: "Gagal menyimpan" }, { status: 500 });
  }
}
