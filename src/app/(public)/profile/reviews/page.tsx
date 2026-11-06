"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, Pencil } from "lucide-react";

interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  venue_name: string;
  court_name?: string;
  created_at: string;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
          aria-hidden={true}
        />
      ))}
    </span>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/customer/reviews")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.error === "Unauthorized") {
          router.push("/login");
          return;
        }
        const d = data as unknown;
        const list = Array.isArray(d)
          ? d
          : ((d as { reviews?: ReviewItem[] } | null)?.reviews ?? (d as { data?: ReviewItem[] } | null)?.data ?? []);
        if (Array.isArray(list)) setReviews(list as ReviewItem[]);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <Link href="/profile" className="text-emerald-600 text-sm hover:underline">← Profil</Link>
          <h1 className="text-lg font-bold mt-1">Ulasan Saya</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {reviews.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Pencil className="mx-auto mb-3 h-10 w-10 text-gray-300" aria-hidden={true} />
            <p className="font-medium">Belum ada ulasan</p>
            <p className="text-sm mt-1">Tulis ulasan setelah selesai booking</p>
          </div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900">{r.venue_name}</p>
                <span className="text-xs text-gray-400">{formatDate(r.created_at)}</span>
              </div>
              {r.court_name && <p className="text-sm text-gray-500">{r.court_name}</p>}
              <div className="mt-1"><Stars rating={r.rating} /></div>
              <p className="text-gray-700 mt-2 text-sm">{r.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
