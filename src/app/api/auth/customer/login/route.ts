import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/auth/service";
import { createToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { getClientIP, isLoginBlocked, recordLoginFail, resetLoginFail } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email dan password wajib diisi" },
        { status: 400 },
      );
    }

    // Rate limit: 5 gagal / 10 menit per IP+email
    const failKey = `${ip}:${String(email).toLowerCase()}`;
    const blocked = await isLoginBlocked(failKey);
    if (blocked) {
      const menit = Math.ceil(blocked.retryAfter / 60);
      return NextResponse.json(
        { success: false, error: `Terlalu banyak percobaan login. Coba lagi dalam ${menit} menit.` },
        { status: 429 },
      );
    }

    const customer = await authenticateCustomer(email, password);

    if (!customer) {
      await recordLoginFail(failKey);
      return NextResponse.json(
        { success: false, error: "Email atau password salah" },
        { status: 401 },
      );
    }

    // Sukses → reset counter
    await resetLoginFail(failKey);

    const token = await createToken({
      userId: customer.id,
      role: "customer",
      name: customer.name,
      email: customer.email,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        userId: customer.id,
        role: "customer",
        name: customer.name,
        email: customer.email,
        loyaltyPoints: customer.loyaltyPoints,
        loyaltyTier: customer.loyaltyTier,
      },
    });

    response.cookies.set(CUSTOMER_TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Customer login error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
