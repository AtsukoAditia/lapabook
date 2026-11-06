import { redirect } from "next/navigation";

type Props = { params: Promise<{ sport: string }> };

export default async function LegacySportPage({ params }: Props) {
  const { sport } = await params;
  redirect(`/cari/${sport}`);
}
