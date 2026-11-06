import { z } from "zod";

// ── Zod schemas for group booking endpoints ──

export const createGroupBookingSchema = z.object({
  venueId: z.string().min(1, "Venue wajib dipilih"),
  courtId: z.string().min(1, "Lapangan wajib dipilih"),
  sportId: z.string().min(1, "Olahraga wajib dipilih"),
  title: z.string().min(3, "Judul minimal 3 karakter").max(120),
  description: z.string().max(500).optional(),
  minParticipants: z.number().int().min(2, "Minimal peserta minimal 2").max(50),
  maxParticipants: z.number().int().min(2, "Maksimal peserta minimal 2").max(50),
  pricePerSlot: z.number().min(0).optional(),
  deadline: z.string().optional(),
  timeSlots: z
    .array(
      z.object({
        slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD"),
        startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format jam: HH:MM"),
        endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format jam: HH:MM"),
      }),
    )
    .min(1, "Minimal 1 time slot")
    .max(5, "Maksimal 5 time slot"),
});

export type CreateGroupBookingSchema = z.infer<typeof createGroupBookingSchema>;

export const addTimeSlotSchema = z.object({
  slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format jam: HH:MM"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format jam: HH:MM"),
});

export const inviteParticipantSchema = z.object({
  customerIds: z.array(z.string().min(1, "Customer ID tidak valid")).min(1).max(30),
});

export const respondSchema = z.object({
  status: z.enum(["accepted", "declined"]),
  availability: z.array(z.string()).max(50).optional(),
});

export const voteSchema = z.object({
  timeSlotId: z.string().min(1, "Time slot wajib dipilih"),
});

// ── Manual validation helper (kept in sync with schemas above) ──

export interface ValidationResult {
  success: boolean;
  errors?: string[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function validateCreateGroupBooking(input: {
  venueId: string;
  courtId: string;
  sportId: string;
  title: string;
  minParticipants: number;
  maxParticipants: number;
  timeSlots: { slotDate: string; startTime: string; endTime: string }[];
}): ValidationResult {
  const errors: string[] = [];

  if (!input.venueId) errors.push("Venue wajib dipilih.");
  if (!input.courtId) errors.push("Lapangan wajib dipilih.");
  if (!input.sportId) errors.push("Olahraga wajib dipilih.");
  if (!input.title || input.title.trim().length < 3) {
    errors.push("Judul wajib diisi (minimal 3 karakter).");
  }
  if (input.minParticipants < 2) {
    errors.push("Minimal peserta minimal 2 orang.");
  }
  if (input.maxParticipants < 2) {
    errors.push("Maksimal peserta minimal 2 orang.");
  }
  if (input.maxParticipants < input.minParticipants) {
    errors.push("Maksimal peserta harus lebih besar dari minimal peserta.");
  }
  if (!input.timeSlots || input.timeSlots.length === 0) {
    errors.push("Minimal 1 time slot wajib diisi.");
  } else {
    for (const slot of input.timeSlots) {
      if (!DATE_RE.test(slot.slotDate)) {
        errors.push(`Format tanggal tidak valid: ${slot.slotDate}`);
      }
      if (!TIME_RE.test(slot.startTime)) {
        errors.push(`Format jam mulai tidak valid: ${slot.startTime}`);
      }
      if (!TIME_RE.test(slot.endTime)) {
        errors.push(`Format jam selesai tidak valid: ${slot.endTime}`);
      }
      if (TIME_RE.test(slot.startTime) && TIME_RE.test(slot.endTime)) {
        const [sh, sm] = slot.startTime.split(":").map(Number);
        const [eh, em] = slot.endTime.split(":").map(Number);
        if (eh * 60 + em <= sh * 60 + sm) {
          errors.push(`Jam selesai harus lebih besar dari jam mulai: ${slot.slotDate} ${slot.startTime}`);
        }
      }
    }
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
