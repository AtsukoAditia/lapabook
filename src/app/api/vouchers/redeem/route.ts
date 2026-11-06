import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateVoucher } from "@/lib/services/voucher-service";

const bodySchema = z.object({
  code: z.string().min(1).max(50),
  totalAmount: z.number().int().nonnegative(),
});

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: "Data voucher tidak valid." },
        { status: 400 },
      );
    }

    const result = await validateVoucher(parsed.data.code, parsed.data.totalAmount);
    if (!result.valid) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[vouchers/redeem]", error);
    return NextResponse.json(
      { valid: false, error: "Gagal memproses voucher. Coba lagi." },
      { status: 500 },
    );
  }
}
