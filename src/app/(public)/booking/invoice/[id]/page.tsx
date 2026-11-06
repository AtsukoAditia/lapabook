import { permanentRedirect } from "next/navigation";

// Deep-link lama → canonical baru (Sprint C routes)
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/invoice/${id}`);
}
