import type { NotificationType } from "@/lib/types/domain";

interface TemplateVars {
  bookingCode: string;
  customerName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  paymentStatus: string;
}

interface TemplateResult {
  subject: string;
  message: string;
}

function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const templates: Record<NotificationType, (v: TemplateVars) => TemplateResult> = {
  booking_created: (v) => ({
    subject: `Booking ${v.bookingCode} — Menunggu Pembayaran`,
    message:
      `Halo ${v.customerName},\n\n` +
      `Booking Anda telah dibuat.\n\n` +
      `Kode Booking: ${v.bookingCode}\n` +
      `Tanggal: ${formatDate(v.bookingDate)}\n` +
      `Jam: ${v.startTime} — ${v.endTime}\n` +
      `Total: ${formatCurrency(v.totalPrice)}\n\n` +
      `Silakan lakukan pembayaran untuk mengkonfirmasi booking Anda.\n\n` +
      `Terima kasih,\nLapabook`,
  }),

  booking_confirmed: (v) => ({
    subject: `Booking ${v.bookingCode} Dikonfirmasi`,
    message:
      `Halo ${v.customerName},\n\n` +
      `Booking Anda telah dikonfirmasi.\n\n` +
      `Kode Booking: ${v.bookingCode}\n` +
      `Tanggal: ${formatDate(v.bookingDate)}\n` +
      `Jam: ${v.startTime} — ${v.endTime}\n\n` +
      `Silakan datang sesuai jadwal. Terima kasih!\n\n` +
      `Lapabook`,
  }),

  booking_rejected: (v) => ({
    subject: `Booking ${v.bookingCode} Ditolak`,
    message:
      `Halo ${v.customerName},\n\n` +
      `Mohon maaf, booking Anda dengan kode ${v.bookingCode} ditolak.\n\n` +
      `Silakan hubungi admin untuk informasi lebih lanjut atau buat booking baru.\n\n` +
      `Lapabook`,
  }),

  booking_cancelled: (v) => ({
    subject: `Booking ${v.bookingCode} Dibatalkan`,
    message:
      `Halo ${v.customerName},\n\n` +
      `Booking ${v.bookingCode} telah dibatalkan.\n\n` +
      `Jika Anda sudah melakukan pembayaran, silakan hubungi admin untuk proses refund.\n\n` +
      `Lapabook`,
  }),

  payment_received: (v) => ({
    subject: `Bukti Pembayaran ${v.bookingCode} Diterima`,
    message:
      `Halo ${v.customerName},\n\n` +
      `Bukti pembayaran untuk booking ${v.bookingCode} telah kami terima dan sedang diverifikasi.\n\n` +
      `Kami akan menginformasikan status pembayaran Anda segera.\n\n` +
      `Lapabook`,
  }),

  payment_confirmed: (v) => ({
    subject: `Pembayaran ${v.bookingCode} Dikonfirmasi`,
    message:
      `Halo ${v.customerName},\n\n` +
      `Pembayaran untuk booking ${v.bookingCode} telah dikonfirmasi.\n\n` +
      `Kode Booking: ${v.bookingCode}\n` +
      `Tanggal: ${formatDate(v.bookingDate)}\n` +
      `Jam: ${v.startTime} — ${v.endTime}\n\n` +
      `Booking Anda aktif. Sampai jumpa di lapangan!\n\n` +
      `Lapabook`,
  }),

  payment_rejected: (v) => ({
    subject: `Pembayaran ${v.bookingCode} Ditolak`,
    message:
      `Halo ${v.customerName},\n\n` +
      `Bukti pembayaran untuk booking ${v.bookingCode} tidak dapat diverifikasi.\n\n` +
      `Silakan upload ulang bukti pembayaran yang benar atau hubungi admin.\n\n` +
      `Lapabook`,
  }),

  reminder_before_booking: (v) => ({
    subject: `Pengingat: Booking ${v.bookingCode} Besok`,
    message:
      `Halo ${v.customerName},\n\n` +
      `Ini pengingat bahwa booking Anda akan berlangsung besok.\n\n` +
      `Kode Booking: ${v.bookingCode}\n` +
      `Tanggal: ${formatDate(v.bookingDate)}\n` +
      `Jam: ${v.startTime} — ${v.endTime}\n\n` +
      `Pastikan Anda datang tepat waktu. Sampai jumpa!\n\n` +
      `Lapabook`,
  }),

  admin_new_booking: (v) => ({
    subject: `[Admin] Booking Baru: ${v.bookingCode}`,
    message:
      `Booking baru masuk.\n\n` +
      `Kode: ${v.bookingCode}\n` +
      `Pelanggan: ${v.customerName}\n` +
      `Tanggal: ${formatDate(v.bookingDate)}\n` +
      `Jam: ${v.startTime} — ${v.endTime}\n` +
      `Total: ${formatCurrency(v.totalPrice)}\n\n` +
      `Silakan review di dashboard admin.`,
  }),

  refund_requested: (v) => ({
    subject: `Refund ${v.bookingCode} Diajukan`,
    message:
      `Halo ${v.customerName},\n\n` +
      `Pengajuan refund untuk booking ${v.bookingCode} telah kami terima.\n\n` +
      `Admin akan memproses maksimal 1x24 jam. Kami kabari hasilnya via WhatsApp ini.\n\n` +
      `Lapabook`,
  }),

  refund_approved: (v) => ({
    subject: `Refund ${v.bookingCode} Disetujui`,
    message:
      `Halo ${v.customerName},\n\n` +
      `Pengajuan refund untuk booking ${v.bookingCode} (${formatCurrency(v.totalPrice)}) DISETUJUI.\n\n` +
      `Dana dikembalikan ke rekening/e-wallet asal maksimal 3 hari kerja.\n\n` +
      `Lapabook`,
  }),

  refund_rejected: (v) => ({
    subject: `Refund ${v.bookingCode} Ditolak`,
    message:
      `Halo ${v.customerName},\n\n` +
      `Mohon maaf, pengajuan refund untuk booking ${v.bookingCode} DITOLAK.\n\n` +
      `Silakan hubungi admin untuk detail atau banding.\n\n` +
      `Lapabook`,
  }),

  admin_payment_proof: (v) => ({
    subject: `[Admin] Bukti Pembayaran: ${v.bookingCode}`,
    message:
      `Bukti pembayaran baru diupload.\n\n` +
      `Kode: ${v.bookingCode}\n` +
      `Pelanggan: ${v.customerName}\n` +
      `Total: ${formatCurrency(v.totalPrice)}\n\n` +
      `Silakan verifikasi di dashboard admin.`,
  }),
};

export function getNotificationTemplate(
  type: NotificationType,
  vars: TemplateVars,
): TemplateResult {
  const generator = templates[type];
  if (!generator) {
    return {
      subject: `Notifikasi: ${vars.bookingCode}`,
      message: `Notifikasi untuk booking ${vars.bookingCode}.`,
    };
  }
  return generator(vars);
}