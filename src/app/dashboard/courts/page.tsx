"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Trophy, LandPlot, Building2, Wallet } from "lucide-react";

interface Court {
  id: string;
  name: string;
  sportId: string;
  basePrice: number;
  isActive: boolean;
  venueId: string;
}

interface Sport {
  id: string;
  name: string;
  icon?: string;
  slug?: string;
}

interface Venue {
  id: string;
  name: string;
  address: string;
}

const SPORT_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  futsal: { label: "Futsal", icon: Trophy, color: "bg-emerald-100 text-emerald-700" },
  basket: { label: "Basket", icon: Trophy, color: "bg-orange-100 text-orange-700" },
  volleyball: { label: "Voli", icon: Trophy, color: "bg-blue-100 text-blue-700" },
  badminton: { label: "Badminton", icon: Trophy, color: "bg-purple-100 text-purple-700" },
  tennis: { label: "Tenis", icon: Trophy, color: "bg-yellow-100 text-yellow-700" },
  soccer: { label: "Sepakbola", icon: Trophy, color: "bg-green-100 text-green-700" },
  padel: { label: "Padel", icon: Trophy, color: "bg-teal-100 text-teal-700" },
  "bulu-tangkis": { label: "Bulu Tangkis", icon: Trophy, color: "bg-purple-100 text-purple-700" },
  "mini-soccer": { label: "Mini Soccer", icon: Trophy, color: "bg-green-100 text-green-700" },
};

export default function OwnerCourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVenue, setFilterVenue] = useState("all");
  const [filterSport, setFilterSport] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    venueId: "",
    sportId: "",
    name: "",
    surfaceType: "",
    indoorType: "outdoor",
    capacity: "",
    basePrice: "",
  });
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/owner/courts").then((r) => r.json()),
      fetch("/api/owner/venues").then((r) => r.json()),
      fetch("/api/sports").then((r) => r.json()),
    ])
      .then(([courtsData, venuesData, sportsData]) => {
        setCourts(courtsData.courts ?? []);
        setVenues(venuesData.venues ?? []);
        setSports(sportsData.sports ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refreshCourts = async () => {
    const courtsData = await fetch("/api/owner/courts").then((r) => r.json());
    setCourts(courtsData.courts ?? []);
  };

  function slugPreview(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  const handleCreate = async () => {
    if (!form.venueId || !form.sportId || !form.name || !form.basePrice) {
      setFormError("Venue, olahraga, nama, dan harga wajib diisi");
      return;
    }
    const price = Number(form.basePrice);
    if (Number.isNaN(price) || price < 0) {
      setFormError("Harga tidak valid");
      return;
    }
    setFormSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/owner/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: form.venueId,
          sportId: form.sportId,
          name: form.name,
          surfaceType: form.surfaceType,
          indoorType: form.indoorType,
          capacity: form.capacity === "" ? 0 : Number(form.capacity),
          basePrice: price,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Gagal membuat lapangan");
        return;
      }
      setShowModal(false);
      setForm({ venueId: "", sportId: "", name: "", surfaceType: "", indoorType: "outdoor", capacity: "", basePrice: "" });
      await refreshCourts();
    } catch {
      setFormError("Terjadi kesalahan");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (courtId: string, currentActive: boolean) => {
    setActionLoading(courtId);
    try {
      const res = await fetch(`/api/owner/courts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courtId, isActive: !currentActive }),
      });
      if (res.ok) {
        setCourts((prev) =>
          prev.map((c) => (c.id === courtId ? { ...c, isActive: !currentActive } : c))
        );
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const getSportInfo = (sportId: string): { label: string; icon: LucideIcon; color: string } => {
    const sport = sports.find((s) => s.id === sportId);
    if (sport?.slug && sport.slug in SPORT_CONFIG) {
      return SPORT_CONFIG[sport.slug];
    }
    if (sport) {
      return { label: sport.name, icon: Trophy, color: "bg-gray-100 text-gray-700" };
    }
    return { label: sportId, icon: Trophy, color: "bg-gray-100 text-gray-700" };
  };

  const filteredCourts = courts.filter((c) => {
    if (filterVenue !== "all" && c.venueId !== filterVenue) return false;
    if (filterSport !== "all" && c.sportId !== filterSport) return false;
    return true;
  });

  const sportCounts = courts.reduce<Record<string, number>>((acc, c) => {
    acc[c.sportId] = (acc[c.sportId] || 0) + 1;
    return acc;
  }, {});

  const getVenueName = (venueId: string) => venues.find((v) => v.id === venueId)?.name || "Venue";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900">Lapangan</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
        <span className="text-gray-400">›</span>
        <span className="text-gray-900 font-medium">Lapangan</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Lapangan</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola lapangan di semua venue Anda</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
        >
          + Tambah Lapangan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-3xl font-black text-gray-900">{courts.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Lapangan</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-3xl font-black text-emerald-600">{courts.filter((c) => c.isActive).length}</p>
          <p className="text-sm text-gray-500 mt-1">Aktif</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-3xl font-black text-gray-400">{courts.filter((c) => !c.isActive).length}</p>
          <p className="text-sm text-gray-500 mt-1">Nonaktif</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-3xl font-black text-blue-600">{Object.keys(sportCounts).length}</p>
          <p className="text-sm text-gray-500 mt-1">Jenis Olahraga</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterVenue}
          onChange={(e) => setFilterVenue(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Semua Venue</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        <select
          value={filterSport}
          onChange={(e) => setFilterSport(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Semua Olahraga</option>
          {Object.entries(sportCounts).map(([sportId, count]) => {
            const sportInfo = getSportInfo(sportId);
            return (
              <option key={sportId} value={sportId}>
                {sportInfo.label} ({count})
              </option>
            );
          })}
        </select>
      </div>

      {/* Court List */}
      {filteredCourts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <LandPlot aria-hidden={true} className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-700 mb-2">
            {courts.length === 0 ? "Belum ada lapangan" : "Tidak ada lapangan"}
          </p>
          <p className="text-gray-500 mb-6">
            {courts.length === 0
              ? "Tambahkan lapangan ke venue Anda melalui halaman Venue"
              : "Tidak ada lapangan dengan filter ini"}
          </p>
          {courts.length === 0 && (
            <Link
              href="/dashboard/venues"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
            >
              Kelola Venue
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourts.map((court) => {
            const sportInfo = getSportInfo(court.sportId);
            const venueName = getVenueName(court.venueId);

            return (
              <div
                key={court.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${sportInfo.color}`}>
                        <sportInfo.icon aria-hidden={true} className="h-3 w-3" /> {sportInfo.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${court.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {court.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 truncate">{court.name}</h3>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-gray-600 mb-4">
                  <p className="flex items-center gap-1.5"><Building2 aria-hidden={true} className="h-4 w-4" /> {venueName}</p>
                  <p className="flex items-center gap-1.5"><Wallet aria-hidden={true} className="h-4 w-4" /> Rp {court.basePrice.toLocaleString("id-ID")} / jam</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(court.id, court.isActive)}
                    disabled={actionLoading === court.id}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                      court.isActive
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    }`}
                  >
                    {actionLoading === court.id ? "..." : court.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">Tambah Lapangan</h2>
            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">{formError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
              <select
                value={form.venueId}
                onChange={(e) => setForm({ ...form, venueId: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Pilih venue</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Olahraga *</label>
              <select
                value={form.sportId}
                onChange={(e) => setForm({ ...form, sportId: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Pilih olahraga</option>
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lapangan *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Futsal Court A"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {form.name && (
                <p className="text-xs text-gray-400 mt-1">slug: {slugPreview(form.name) || "-"}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Permukaan</label>
                <input
                  type="text"
                  value={form.surfaceType}
                  onChange={(e) => setForm({ ...form, surfaceType: e.target.value })}
                  placeholder="Rumput Sintetis"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
                <select
                  value={form.indoorType}
                  onChange={(e) => setForm({ ...form, indoorType: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="outdoor">Outdoor</option>
                  <option value="indoor">Indoor</option>
                  <option value="semi_outdoor">Semi Outdoor</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kapasitas</label>
                <input
                  type="number"
                  min={0}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="14"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga / jam *</label>
                <input
                  type="number"
                  min={0}
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                  placeholder="120000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={formSubmitting}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                {formSubmitting ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
