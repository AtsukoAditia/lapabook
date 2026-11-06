import { permanentRedirect } from "next/navigation";

// Deep-link lama → canonical baru (Sprint C routes)
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
  }
  const s = qs.toString();
  permanentRedirect(`/checkout/success${s ? `?${s}` : ""}`);
}
