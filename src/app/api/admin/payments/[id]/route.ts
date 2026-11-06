import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PaymentService } from "@/lib/services/payment-service";
import { verifyToken, ADMIN_TOKEN_NAME } from "@/lib/auth/jwt";
import { logAudit } from "@/lib/audit";

const paymentService = new PaymentService();

type RouteContext = { params: Promise<{ id: string }> };

async function handlePaymentAction(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body as { action?: string };

    if (!action || !["confirm", "reject", "refund-approve", "refund-reject"].includes(action)) {
      return NextResponse.json(
        { error: 'action harus "confirm", "reject", "refund-approve", atau "refund-reject"' },
        { status: 400 },
      );
    }

    const booking =
      action === "confirm"
        ? await paymentService.confirmPayment(id, "admin")
        : action === "reject"
          ? await paymentService.rejectPayment(id, "admin")
          : action === "refund-approve"
            ? await paymentService.approveRefund(id, "admin")
            : await paymentService.rejectRefund(id, "admin");

    // Audit trail: konfirmasi/penolakan pembayaran manual
    try {
      const cookieStore = await cookies();
      const adminSession = await verifyToken(cookieStore.get(ADMIN_TOKEN_NAME)?.value ?? "");
      if (adminSession) {
        await logAudit(
          adminSession.userId,
          adminSession.role,
          `payment.${action}`,
          "booking",
          id,
          { bookingCode: booking.bookingCode },
        );
      }
    } catch {
      // best-effort
    }

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memproses pembayaran";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handlePaymentAction(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handlePaymentAction(request, context);
}
