"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SlotSelector from "@/components/booking/SlotSelector";
import StickyCheckoutBar from "@/components/venue/StickyCheckoutBar";
import { getSportVisual } from "@/lib/sport-icons";
import type { Court, Sport } from "@/lib/types/domain";
import type { TimeSlot } from "@/hooks/useRealtimeAvailability";
import { Users, Wind, Layers, ArrowRight } from "lucide-react";

type TimeSlotRef = TimeSlot;

type Props = {
  venueId: string;
  venueSlug: string;
  openTime: string;
  closeTime: string;
  courts: Court[];
  sports: Sport[];
  /** Court awal (opsional, dari query ?court=). Default: court pertama aktif. */
  initialCourtId?: string;
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function VenueBookingClient({
  venueId: _venueId,
  venueSlug,
  openTime,
  closeTime,
  courts,
  sports,
  initialCourtId,
}: Props) {
  const router = useRouter();
  const activeCourts = courts.filter((c) => c.isActive);
  const [selectedCourtId, setSelectedCourtId] = useState<string>(
    () => initialCourtId && activeCourts.some((c) => c.id === initialCourtId)
      ? initialCourtId
      : activeCourts[0]?.id ?? "",
  );
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlots, setSelectedSlots] = useState<TimeSlotRef[]>([]);
  const selectorRef = useRef<HTMLDivElement>(null);

  const selectedCourt = useMemo(
    () => activeCourts.find((c) => c.id === selectedCourtId),
    [activeCourts, selectedCourtId],
  );
  const selectedSport = useMemo(
    () => sports.find((s) => s.id === selectedCourt?.sportId),
    [sports, selectedCourt],
  );

  function switchCourt(id: string) {
    if (id === selectedCourtId) return;
    setSelectedCourtId(id);
    setSelectedSlots([]);
    // scroll halus ke selector (mobile UX keep-continue-on)
    selectorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const sortedSelected = [...selectedSlots].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  );
  const slotCount = selectedSlots.length;
  const first = sortedSelected[0];
  const last = sortedSelected[sortedSelected.length - 1];
  const timeRange = first && last ? `${first.startTime}–${last.endTime}` : "";
  const totalEstimate = slotCount * (selectedCourt?.basePrice ?? 0);

  function handleCheckout() {
    if (!selectedCourt || slotCount === 0 || !selectedDate) return;
    const params = new URLSearchParams({
      courtId: selectedCourt.id,
      date: selectedDate,
      startTime: first.startTime,
      endTime: last.endTime,
      sport: selectedSport?.slug ?? "",
      venue: venueSlug,
      court: selectedCourt.slug,
      duration: String(slotCount),
    });
    router.push(`/checkout?${params.toString()}`);
  }

  if (activeCourts.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Belum ada lapangan aktif di venue ini.
      </div>
    );
  }

  return (
    <div>
      {/* Court switcher pills */}
      <div
        role="tablist"
        aria-label="Pilih lapangan"
        className="mb-5 flex snap-x gap-2 overflow-x-auto pb-2"
      >
        {activeCourts.map((court) => {
          const isActive = court.id === selectedCourtId;
          const { Icon, colorClass } = getSportVisual(
            sports.find((s) => s.id === court.sportId)?.slug,
          );
          return (
            <button
              key={court.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => switchCourt(court.id)}
              className={`flex min-h-[44px] shrink-0 cursor-pointer snap-start items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? "border-blue-700 bg-blue-800 text-white shadow"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"
              }`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${isActive ? "bg-white/15" : colorClass}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              {court.name}
            </button>
          );
        })}
      </div>

      {/* Court meta */}
      {selectedCourt && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
            <Layers className="h-3 w-3" aria-hidden="true" /> {selectedCourt.surfaceType}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
            <Wind className="h-3 w-3" aria-hidden="true" /> {selectedCourt.indoorType.replace("_", " ")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
            <Users className="h-3 w-3" aria-hidden="true" /> {selectedCourt.capacity} pemain
          </span>
          {selectedSport && (
            <button
              onClick={() => router.push(`/cari/${selectedSport.slug}`)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-800 hover:bg-blue-100"
            >
              {selectedSport.name}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Slot selector */}
      <div ref={selectorRef} className="scroll-mt-20">
        {selectedCourt && selectedSport && (
          <SlotSelector
            key={selectedCourt.id}
            courtId={selectedCourt.id}
            sportSlug={selectedSport.slug}
            venueSlug={venueSlug}
            courtSlug={selectedCourt.slug}
            openTime={openTime}
            closeTime={closeTime}
            hideContinue
            onSelectionChange={({ date, slots }) => {
              setSelectedDate(date);
              setSelectedSlots(slots);
            }}
          />
        )}
      </div>

      {/* Spacer biar sticky bar ga nutupin konten */}
      {slotCount > 0 && <div className="h-24" aria-hidden="true" />}

      {/* Sticky bottom CTA */}
      {selectedCourt && (
        <StickyCheckoutBar
          courtName={selectedCourt.name}
          dateLabel={selectedDate ? formatDateLabel(selectedDate) : ""}
          slotCount={slotCount}
          timeRange={timeRange}
          totalEstimate={totalEstimate}
          onCheckout={handleCheckout}
        />
      )}
    </div>
  );
}
