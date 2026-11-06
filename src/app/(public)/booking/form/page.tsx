import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Legacy /booking/form → /checkout (Sprint B: 1-halaman checkout).
// Semua query params diteruskan apa adanya (courtId/date/startTime/endTime/dll)
// supaya deep-link lama & SlotSelector wizard lama tetap berfungsi.
export default async function LegacyBookingFormPage({ searchParams }: Props) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
    else if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
  }
  const suffix = qs.toString();
  redirect(`/checkout${suffix ? `?${suffix}` : ""}`);
}
