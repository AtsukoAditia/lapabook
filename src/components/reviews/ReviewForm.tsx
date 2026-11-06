"use client";

import { useState } from "react";
import { PartyPopper } from "lucide-react";
import StarRating from "./StarRating";

interface ReviewFormProps {
  bookingId: string;
  venueId: string;
  courtId?: string;
  onSuccess?: () => void;
}

export default function ReviewForm({ bookingId, venueId, courtId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const MAX_PHOTOS = 3;

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = MAX_PHOTOS - photos.length;
    const toUpload = files.slice(0, remaining);
    if (toUpload.length === 0) {
      setError(`Maksimal ${MAX_PHOTOS} foto.`);
      return;
    }

    setUploading(true);
    setError("");

    Promise.all(
      toUpload.map(async (file) => {
        if (!file.type.startsWith("image/")) {
          throw new Error("Hanya file gambar yang diperbolehkan.");
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("Ukuran foto maksimal 5MB.");
        }
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Gagal membaca file."));
          reader.readAsDataURL(file);
        });
        const res = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: base64.split(",")[1], mimeType: file.type }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Gagal mengupload foto.");
        return data.url as string;
      }),
    )
      .then((urls) => setPhotos((prev) => [...prev, ...urls]))
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal mengupload foto."))
      .finally(() => setUploading(false));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Pilih rating bintang dulu");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          venueId,
          courtId,
          rating,
          comment,
          photos,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim review");
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim review");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="flex justify-center mb-2">
          <PartyPopper className="h-10 w-10 text-green-600" aria-hidden={true} />
        </div>
        <h3 className="text-lg font-semibold text-green-800 mb-1">Review Terkirim!</h3>
        <p className="text-green-600">Terima kasih atas review kamu.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold">Beri Review</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Komentar</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ceritakan pengalaman kamu..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          rows={4}
          maxLength={1000}
        />
        <p className="text-xs text-gray-500 mt-1">{comment.length}/1000</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Foto (maks {MAX_PHOTOS})</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {photos.map((url, i) => (
            <div key={url} className="relative">
              <img src={url} alt={`Foto ${i + 1}`} className="w-16 h-16 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                aria-label={`Hapus foto ${i + 1}`}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {photos.length < MAX_PHOTOS && (
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            disabled={uploading}
            className="text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-sm"
          />
        )}
        {uploading && <p className="text-xs text-gray-500 mt-1">Mengunggah foto...</p>}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || rating === 0 || uploading}
        className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Mengirim..." : "Kirim Review"}
      </button>
    </form>
  );
}
