import { NextRequest, NextResponse } from "next/server";
import { ADMIN_TOKEN_NAME, createToken } from "@/lib/auth/jwt";
import { authenticateAdmin } from "@/lib/auth/service";
import { getClientIP, isLoginBlocked, recordLoginFail, resetLoginFail } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 },
      );
    }

    // Rate limit: 5 gagal / 10 menit per IP+email
    const failKey = `${ip}:${String(email).toLowerCase()}`;
    const blocked = await isLoginBlocked(failKey);
    if (blocked) {
      const menit = Math.ceil(blocked.retryAfter / 60);
      return NextResponse.json(
        { error: `Terlalu banyak percobaan login. Coba lagi dalam ${menit} menit.` },
        { status: 429 },
      );
    }

    const admin = await authenticateAdmin(email, password);

    if (!admin) {
      await recordLoginFail(failKey);
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 },
      );
    }

    // Sukses → reset counter
    await resetLoginFail(failKey);

    const token = await createToken({
      userId: admin.id,
      role: admin.role,
      name: admin.name,
      email: admin.email,
    });

    const adminSecret = process.env.ADMIN_SECRET_PATH || "";
    const dashboardUrl = adminSecret ? `/${adminSecret}` : "/admin";

    const response = NextResponse.json({
      success: true,
      dashboardUrl,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });

    response.cookies.set(ADMIN_TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
