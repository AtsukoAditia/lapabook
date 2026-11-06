"use client";

import { ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/mock-data";

type Props = {
  courtName: string;
  dateLabel: string;
  slotCount: number;
  timeRange: string;
  totalEstimate: number;
  onCheckout: () => void;
};

export default function StickyCheckoutBar({
  courtName,
  dateLabel,
  slotCount,
  timeRange,
  totalEstimate,
  onCheckout,
}: Props) {
  if (slotCount === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-900">
            {courtName} • {slotCount} jam
          </div>
          <div className="truncate text-xs text-slate-500">
            {dateLabel} • {timeRange} • Estimasi {formatPrice(totalEstimate)}
          </div>
        </div>
        <button
          onClick={onCheckout}
          className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow transition-all hover:bg-orange-500 motion-safe:hover:scale-105"
        >
          Lanjut Bayar
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
