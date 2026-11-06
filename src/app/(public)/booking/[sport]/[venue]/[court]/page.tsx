import { redirect, notFound } from "next/navigation";
import { getDatabaseAdapter } from "@/lib/adapters";

type Props = {
  params: Promise<{ sport: string; venue: string; court: string }>;
};

// Legacy wizard court page → /venue/[venueId]?court=[courtSlug] (Sprint A)
export default async function LegacyCourtPage({ params }: Props) {
  const { venue: venueSlug, court: courtSlug } = await params;
  const adapter = getDatabaseAdapter();
  const venue = await adapter
    .getVenues()
    .then((vs) => vs.find((v) => v.slug === venueSlug))
    .catch(() => null);
  if (!venue) notFound();
  redirect(`/venue/${venue.id}?court=${encodeURIComponent(courtSlug)}`);
}
