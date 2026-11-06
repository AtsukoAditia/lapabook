import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDatabaseAdapter } from "@/lib/adapters";
import { verifyToken, ADMIN_TOKEN_NAME } from "@/lib/auth/jwt";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { status } = await request.json() as { status?: string };

    if (!status || !["active", "rejected", "suspended"].includes(status)) {
      return NextResponse.json(
        { error: "Status tidak valid. Gunakan: active, rejected, suspended" },
        { status: 400 },
      );
    }

    const adapter = getDatabaseAdapter();
    const owner = await adapter.updateVenueOwnerStatus(id, status as "active" | "rejected" | "suspended");

    // Audit trail: suspend/aktivasi owner
    try {
      const cookieStore = await cookies();
      const adminSession = await verifyToken(cookieStore.get(ADMIN_TOKEN_NAME)?.value ?? "");
      if (adminSession) {
        await logAudit(
          adminSession.userId,
          adminSession.role,
          "owner.status_update",
          "venue_owner",
          id,
          { status },
        );
      }
    } catch {
      // best-effort
    }

    return NextResponse.json({ success: true, owner });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal update status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
