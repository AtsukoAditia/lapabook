import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, ADMIN_TOKEN_NAME, OWNER_TOKEN_NAME, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";

export async function GET(request: Request) {
  const cookieStore = await cookies();

  const adminToken = cookieStore.get(ADMIN_TOKEN_NAME)?.value;
  const ownerToken = cookieStore.get(OWNER_TOKEN_NAME)?.value;
  const customerToken = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;

  // Validate all tokens
  const [adminSession, ownerSession, customerSession] = await Promise.all([
    adminToken ? verifyToken(adminToken) : Promise.resolve(null),
    ownerToken ? verifyToken(ownerToken) : Promise.resolve(null),
    customerToken ? verifyToken(customerToken) : Promise.resolve(null),
  ]);

  // Determine caller context from referer to prioritize correctly
  // Owner dashboard calls should prefer owner token, even if admin token also exists
  // ponytail: referer heuristics rapuh (bisa difalsukan) — idealnya client kirim ?context= eksplisit
  const referer = request.headers.get("referer") || "";
  const isOwnerContext = referer.includes("/dashboard");
  const adminSecret = process.env.ADMIN_SECRET_PATH || "dev-only-do-not-deploy";
  const isAdminContext = referer.includes("/admin") || referer.includes(`/${adminSecret}`);

  let session = null;
  let source: "admin" | "owner" | "customer" | null = null;

  if (isOwnerContext) {
    // Dashboard context → prefer owner
    if (ownerSession) { session = ownerSession; source = "owner"; }
    else if (adminSession) { session = adminSession; source = "admin"; }
    else if (customerSession) { session = customerSession; source = "customer"; }
  } else if (isAdminContext) {
    if (adminSession) { session = adminSession; source = "admin"; }
    else if (ownerSession) { session = ownerSession; source = "owner"; }
    else if (customerSession) { session = customerSession; source = "customer"; }
  } else {
    // Default: return most relevant, prefer owner > admin > customer if multiple valid
    // But keep backward compat: if only one exists, return it
    if (ownerSession && adminSession) {
      // Both valid: if request has no clear context, return owner if referer is empty from dashboard login
      // Heuristic: dashboard login page sets referer empty or dashboard, we default to owner when present
      // This fixes bug where super_admin login blocks owner dashboard
      session = ownerSession; source = "owner";
    } else if (adminSession) { session = adminSession; source = "admin"; }
    else if (ownerSession) { session = ownerSession; source = "owner"; }
    else if (customerSession) { session = customerSession; source = "customer"; }
  }

  if (!session) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      userId: session.userId,
      role: session.role,
      name: session.name,
      email: session.email,
      ownerId: session.ownerId,
      impersonating: session.impersonating,
    },
    source,
    // Include all valid sessions so client can decide
    sessions: {
      admin: adminSession ? { role: adminSession.role, email: adminSession.email } : null,
      owner: ownerSession ? { role: ownerSession.role, email: ownerSession.email, ownerId: ownerSession.ownerId } : null,
      customer: customerSession ? { role: customerSession.role, email: customerSession.email } : null,
    },
  });
}
