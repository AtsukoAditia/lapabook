import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, OWNER_TOKEN_NAME } from "@/lib/auth/jwt";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(OWNER_TOKEN_NAME)?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }
  const session = await verifyToken(token);
  if (!session || session.role !== "owner") {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      userId: session.userId,
      role: session.role,
      name: session.name,
      email: session.email,
      ownerId: session.ownerId,
    },
  });
}
