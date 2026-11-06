import { getDatabaseAdapter } from "@/lib/adapters";
import type {
  NotificationPayload,
  NotificationLog,
  Booking,
  NotificationChannel,
  NotificationType,
} from "@/lib/types/domain";
import { getNotificationTemplate } from "@/lib/notification-templates";
import { sendMessage, formatPhoneNumber, isWhatsAppReady } from "@/lib/whatsapp/client";

export interface SendNotificationInput {
  type: NotificationType;
  channel: NotificationChannel;
  booking: Booking;
  recipient: string;
}

/**
 * Build a WhatsApp click-to-chat link so the venue/customer can confirm a
 * booking. No WA automation required — plain wa.me URL, zero dependencies.
 */
export function generateWhatsAppConfirmLink(
  booking: Pick<Booking, "bookingCode" | "customerName" | "bookingDate" | "startTime" | "endTime" | "totalPrice">,
  venuePhone: string,
): string {
  const digits = venuePhone.replace(/\D/g, "").replace(/^0/, "62");
  const template =
    `Halo, saya ${booking.customerName}. Booking saya sudah dikonfirmasi.\n` +
    `Kode Booking: ${booking.bookingCode}\n` +
    `Tanggal: ${booking.bookingDate}\n` +
    `Jam: ${booking.startTime} - ${booking.endTime}\n` +
    `Total: Rp ${booking.totalPrice.toLocaleString("id-ID")}\n` +
    `Terima kasih.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(template)}`;
}

/**
 * After a payment is confirmed, persist the WA confirm link so staff (or a
 * future automation) can send it out. Non-blocking by design — a malformed
 * venue phone still yields a useful row in notification_logs.
 */
export async function recordWhatsAppConfirmLink(
  booking: Booking,
  venueId: string,
): Promise<string | null> {
  try {
    const adapter = getDatabaseAdapter();
    const venue = await adapter.getVenueById(venueId);
    const venuePhone = venue?.phone ?? "";
    if (!venuePhone) return null;
    const link = generateWhatsAppConfirmLink(booking, venuePhone);
    await adapter.createNotificationLog(
      {
        type: "payment_confirmed",
        channel: "whatsapp",
        recipient: venuePhone,
        subject: `WA confirm ${booking.bookingCode}`,
        message: link,
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
      },
      "sent",
    );
    return link;
  } catch (error) {
    console.error("[WA confirm link]", error);
    return null;
  }
}

/**
 * Build and send a notification, persisting to the notification_logs table.
 * In MVP, all notifications are logged but not actually delivered via email/SMS.
 * This service acts as the foundation for future delivery integrations.
 */
export async function sendNotification(
  input: SendNotificationInput,
): Promise<NotificationLog> {
  const adapter = getDatabaseAdapter();

  const template = getNotificationTemplate(input.type, {
    bookingCode: input.booking.bookingCode,
    customerName: input.booking.customerName,
    bookingDate: input.booking.bookingDate,
    startTime: input.booking.startTime,
    endTime: input.booking.endTime,
    totalPrice: input.booking.totalPrice,
    paymentStatus: input.booking.paymentStatus,
  });

  const payload: NotificationPayload = {
    type: input.type,
    channel: input.channel,
    recipient: input.recipient,
    subject: template.subject,
    message: template.message,
    bookingId: input.booking.id,
    bookingCode: input.booking.bookingCode,
  };

  try {
    // Try real WhatsApp delivery if channel is whatsapp and service is ready
    if (input.channel === "whatsapp") {
      const ready = await isWhatsAppReady();
      if (ready) {
        const phone = formatPhoneNumber(input.recipient);
        const result = await sendMessage(phone, template.message);
        const status = result.success ? "sent" : "failed";
        const log = await adapter.createNotificationLog(
          payload,
          status,
          result.error,
        );
        console.log(
          `[WhatsApp] ${input.type} to ${phone} — ${result.success ? "sent" : "failed"}: ${result.error || log.id}`,
        );
        return log;
      }
    }

    // Fallback: log as "sent" (no actual delivery)
    const log = await adapter.createNotificationLog(payload, "sent");
    console.log(
      `[Notification] ${input.type} via ${input.channel} to ${input.recipient} — ${log.id}`,
    );
    return log;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const log = await adapter.createNotificationLog(
      payload,
      "failed",
      errorMessage,
    );
    console.error(
      `[Notification] FAILED ${input.type} via ${input.channel}: ${errorMessage}`,
    );
    return log;
  }
}

/**
 * Send booking_created notification to customer (after booking is made)
 */
export async function sendBookingCreated(
  booking: Booking,
): Promise<NotificationLog> {
  const recipient = booking.customerEmail || booking.customerPhone;
  const channel: NotificationChannel = booking.customerEmail
    ? "email"
    : "whatsapp";

  return sendNotification({
    type: "booking_created",
    channel,
    booking,
    recipient,
  });
}

/**
 * Send booking_confirmed notification to customer
 */
export async function sendBookingConfirmation(
  booking: Booking,
): Promise<NotificationLog> {
  const recipient = booking.customerEmail || booking.customerPhone;
  const channel: NotificationChannel = booking.customerEmail
    ? "email"
    : "whatsapp";

  return sendNotification({
    type: "booking_confirmed",
    channel,
    booking,
    recipient,
  });
}

/**
 * Send payment_confirmed notification to customer
 */
export async function sendPaymentConfirmation(
  booking: Booking,
): Promise<NotificationLog> {
  const recipient = booking.customerEmail || booking.customerPhone;
  const channel: NotificationChannel = booking.customerEmail
    ? "email"
    : "whatsapp";

  return sendNotification({
    type: "payment_confirmed",
    channel,
    booking,
    recipient,
  });
}

/**
 * Send booking_rejected notification to customer
 */
export async function sendBookingRejection(
  booking: Booking,
): Promise<NotificationLog> {
  const recipient = booking.customerEmail || booking.customerPhone;
  const channel: NotificationChannel = booking.customerEmail
    ? "email"
    : "whatsapp";

  return sendNotification({
    type: "booking_rejected",
    channel,
    booking,
    recipient,
  });
}

/**
 * Send booking_cancelled notification to customer
 */
export async function sendBookingCancellation(
  booking: Booking,
): Promise<NotificationLog> {
  const recipient = booking.customerEmail || booking.customerPhone;
  const channel: NotificationChannel = booking.customerEmail
    ? "email"
    : "whatsapp";

  return sendNotification({
    type: "booking_cancelled",
    channel,
    booking,
    recipient,
  });
}

/**
 * Send admin alert for new booking
 */
export async function sendAdminNewBookingAlert(
  booking: Booking,
): Promise<NotificationLog> {
  return sendNotification({
    type: "admin_new_booking",
    channel: "in_app",
    booking,
    recipient: "admin",
  });
}

/**
 * Send admin alert for payment proof submission
 */
export async function sendAdminPaymentProofAlert(
  booking: Booking,
): Promise<NotificationLog> {
  return sendNotification({
    type: "admin_payment_proof",
    channel: "in_app",
    booking,
    recipient: "admin",
  });
}

/**
 * Send refund_requested / refund_approved / refund_rejected WA ke customer.
 * Best-effort: sendNotification sudah log + catch internal.
 */
export async function sendRefundUpdate(
  booking: Booking,
  type: "refund_requested" | "refund_approved" | "refund_rejected",
): Promise<NotificationLog> {
  return sendNotification({
    type,
    channel: "whatsapp",
    booking,
    recipient: booking.customerPhone,
  });
}

/**
 * Get all notification logs, optionally filtered by booking
 */
export async function getNotificationLogs(
  bookingId?: string,
): Promise<NotificationLog[]> {
  const adapter = getDatabaseAdapter();
  return adapter.getNotificationLogs(bookingId);
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  id: string,
): Promise<NotificationLog> {
  const adapter = getDatabaseAdapter();
  return adapter.markNotificationRead(id);
}