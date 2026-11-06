import { redirect } from "next/navigation";

// Legacy wizard dipermudah → marketplace discovery (Sprint A).
export default function LegacyBookingPage() {
  redirect("/cari");
}
