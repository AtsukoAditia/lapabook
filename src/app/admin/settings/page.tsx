"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

interface Settings {
  platform_fee_default?: number;
  settlement_cutoff_hour?: number;
  app_name?: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings ?? {}))
      .catch(() => setError("Gagal memuat pengaturan"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Gagal menyimpan");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Pengaturan</h1>

      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 aria-hidden={true} className="h-4 w-4 flex-shrink-0" /> Pengaturan berhasil disimpan
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-700">
            Informasi Aplikasi
          </h2>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Nama Aplikasi
            </label>
            <input
              type="text"
              value={settings.app_name ?? ""}
              onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-700">
            Platform
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Platform Fee Default (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.platform_fee_default ?? 10}
                onChange={(e) => setSettings({ ...settings, platform_fee_default: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Settlement Cutoff Hour (0-23)
              </label>
              <input
                type="number"
                min={0}
                max={23}
                value={settings.settlement_cutoff_hour ?? 23}
                onChange={(e) => setSettings({ ...settings, settlement_cutoff_hour: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              {saving ? "Menyimpan..." : (
                <>
                  <Save aria-hidden={true} className="h-4 w-4" /> Simpan Pengaturan
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
