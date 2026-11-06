import { getDatabaseAdapter } from "@/lib/adapters";

export type Voucher = {
  id: string;
  code: string;
  label: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minBookingAmount: number;
  maxUses: number | null;
  usedCount: number;
  validUntil: string | null;
  isActive: boolean;
};

export type RedeemResult =
  | { valid: true; code: string; discountAmount: number; label: string | null }
  | { valid: false; error: string };

export function computeDiscount(v: Pick<Voucher, "discountType" | "discountValue">, totalAmount: number): number {
  if (v.discountType === "percentage") {
    return Math.floor((totalAmount * v.discountValue) / 100);
  }
  return Math.min(v.discountValue, totalAmount);
}

/**
 * Validate a voucher for a given booking total. Pure checks only;
 * does NOT increment used_count (see consumeVoucher).
 */
export async function validateVoucher(code: string, totalAmount: number): Promise<RedeemResult> {
  const adapter = getDatabaseAdapter();
  const voucher = await adapter.getVoucherByCode(code.trim().toUpperCase());

  if (!voucher) return { valid: false, error: "Kode voucher tidak ditemukan." };
  if (!voucher.isActive) return { valid: false, error: "Voucher sudah tidak aktif." };
  if (voucher.validUntil && new Date(voucher.validUntil).getTime() < Date.now()) {
    return { valid: false, error: "Voucher sudah kadaluarsa." };
  }
  if (voucher.maxUses !== null && voucher.usedCount >= voucher.maxUses) {
    return { valid: false, error: "Kuota penggunaan voucher sudah habis." };
  }
  if (totalAmount < voucher.minBookingAmount) {
    return {
      valid: false,
      error: `Minimal booking Rp ${voucher.minBookingAmount.toLocaleString("id-ID")} untuk voucher ini.`,
    };
  }

  return {
    valid: true,
    code: voucher.code,
    discountAmount: computeDiscount(voucher, totalAmount),
    label: voucher.label,
  };
}

/**
 * Atomically mark one use of the voucher. Returns false when the voucher no
 * longer has remaining quota (race-safe against concurrent bookings).
 */
export async function consumeVoucher(code: string): Promise<boolean> {
  const adapter = getDatabaseAdapter();
  return adapter.incrementVoucherUsage(code);
}
