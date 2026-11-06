import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getDatabaseAdapter } from "@/lib/adapters";
import { formatPrice } from "@/lib/mock-data";
import VenueBookingClient from "@/components/venue/VenueBookingClient";
import { MapPin, Phone, Clock, Star, ArrowLeft } from "lucide-react";

type Props = {
  params: Promise<{ venueId: string }>;
  searchParams: Promise<{ court?: string }>;
};

const fmtTime = (t: string) => {
  const parts = t.split(":");
  return `${parts[0]}:${parts[1]}`;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { venueId } = await params;
  const adapter = getDatabaseAdapter();
  const venue = await adapter.getVenueById(venueId).catch(() => null);
  if (!venue) {
    const bySlug = await adapter.getVenueBySlug(venueId).catch(() => null);
    if (!bySlug) return { title: "Venue tidak ditemukan — Lapabook" };
    return {
      title: `${bySlug.name} — Booking Lapangan | Lapabook`,
      description: `Booking lapangan di ${bySlug.name}, ${bySlug.address}. Buka ${bySlug.openTime}-${bySlug.closeTime}. Pilih court & jam langsung.`,
    };
  }
  return {
    title: `${venue.name} — Booking Lapangan | Lapabook`,
    description: `Booking lapangan di ${venue.name}, ${venue.address}. Buka ${venue.openTime}-${venue.closeTime}. Pilih court & jam langsung.`,
  };
}

export default async function VenuePage({ params, searchParams }: Props) {
  const { venueId } = await params;
  const { court: courtSlug } = await searchParams;
  const adapter = getDatabaseAdapter();

  let venue = await adapter.getVenueById(venueId);

  // Canonical by id — slug URL 308 → /venue/{id}
  if (!venue) {
    const bySlug = await adapter.getVenueBySlug(venueId);
    if (!bySlug) return notFound();
    permanentRedirect(`/venue/${bySlug.id}`);
  }

  const [courts, sports] = await Promise.all([
    adapter.getCourtsByVenue(venue.id),
    adapter.getSports(),
  ]);

  if (!venue.isActive) return notFound();

  const activeCourts = courts.filter((c) => c.isActive);
  const minPrice = activeCourts.length
    ? Math.min(...activeCourts.map((c) => c.basePrice))
    : 0;
  const initialCourt = courtSlug
    ? activeCourts.find((c) => c.slug === courtSlug)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <Link
            href="/cari"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-blue-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali cari venue
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-black sm:text-3xl md:text-4xl">
                {venue.name}
              </h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-blue-100">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="line-clamp-1">{venue.address}</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {fmtTime(venue.openTime)} – {fmtTime(venue.closeTime)}
                </span>
                {venue.phone && (
                  <a
                    href={`tel:${venue.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 hover:bg-white/25"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    {venue.phone}
                  </a>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 font-bold">
                  <Star className="h-3.5 w-3.5 fill-white" aria-hidden="true" /> 4.8
                </span>
              </div>
            </div>
            {minPrice > 0 && (
              <div className="rounded-2xl bg-white/10 px-5 py-4 text-right backdrop-blur">
                <div className="text-xs text-blue-200">Mulai dari</div>
                <div className="text-2xl font-black text-orange-400">
                  {formatPrice(minPrice)}
                </div>
                <div className="text-xs text-blue-200">/jam</div>
              </div>
            )}
          </div>
          {venue.mapsUrl && (
            <a
              href={venue.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-200 underline-offset-2 hover:text-white hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Buka di Google Maps
            </a>
          )}
        </div>
      </section>

      {/* Booking section */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <h2 className="mb-4 text-lg font-black text-slate-900 sm:text-xl">
          Pilih Lapangan & Jam
        </h2>
        <VenueBookingClient
          venueId={venue.id}
          venueSlug={venue.slug}
          openTime={venue.openTime}
          closeTime={venue.closeTime}
          courts={activeCourts}
          sports={sports}
          initialCourtId={initialCourt?.id}
        />
      </main>
    </div>
  );
}
