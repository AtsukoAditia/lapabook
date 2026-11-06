"use client";
import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import type { Sport } from "@/lib/types/domain";

const CANONICAL = ["futsal","minisoccer","badminton","padel","tenis","basket"];

export default function AdminSportsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Sport | null>(null);

  const fetchSports = useCallback(async () => {
    const res = await fetch("/api/admin/sports");
    const data = await res.json();
    return (data.sports ?? []) as Sport[];
  }, []);

  useEffect(() => {
    fetchSports().then(s => { setSports(s); setLoading(false); });
  }, [fetchSports]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/sports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), slug: slug.trim().toLowerCase(), isActive: true }) });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Gagal"); return; }
      setSports(await fetchSports()); setName(""); setSlug("");
    } finally { setSaving(false); }
  }

  async function toggleActive(s: Sport) {
    const res = await fetch("/api/admin/sports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, isActive: !s.isActive }) });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    setSports(await fetchSports());
  }

  async function handleDelete(s: Sport) {
    if (!confirm(`Hapus ${s.name} (${s.slug})?`)) return;
    const res = await fetch(`/api/admin/sports?id=${encodeURIComponent(s.id)}`, { method: "DELETE" });
    const d = await res.json();
    if (!res.ok) { alert(d.error); return; }
    setSports(await fetchSports());
  }

  async function saveEdit() {
    if (!editing) return;
    const res = await fetch("/api/admin/sports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, name: editing.name, slug: editing.slug }) });
    const d = await res.json();
    if (!res.ok) { alert(d.error); return; }
    setEditing(null); setSports(await fetchSports());
  }

  if (loading) return <AdminLayout><div className="p-8 text-slate-500">Memuat...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-black text-slate-900">Olahraga</h1>
        <p className="text-sm text-slate-500 mt-1">Kelola 6 olahraga utama. Nonaktifkan untuk sembunyikan dari homepage & pencarian. Hapus hanya jika tidak ada lapangan terpakai.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CANONICAL.map(c => <span key={c} className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">{c}</span>)}
        </div>

        <form onSubmit={handleCreate} className="mt-6 flex flex-col sm:flex-row gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama (mis. Futsal)" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
          <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="slug (mis. futsal)" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
          <button disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Tambah</button>
        </form>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr><th className="text-left px-4 py-2">Nama</th><th className="text-left px-4 py-2">Slug</th><th className="text-left px-4 py-2">Status</th><th className="text-right px-4 py-2">Aksi</th></tr>
            </thead>
            <tbody>
              {sports.map(s => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-semibold text-slate-900">{editing?.id === s.id ? <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="rounded border px-2 py-1 w-full" /> : s.name}</td>
                  <td className="px-4 py-2 text-slate-600">{editing?.id === s.id ? <input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="rounded border px-2 py-1 w-full" /> : s.slug}</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{s.isActive ? "Aktif" : "Nonaktif"}</span></td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      {editing?.id === s.id ? (
                        <><button onClick={saveEdit} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white">Simpan</button><button onClick={() => setEditing(null)} className="rounded-lg border px-3 py-1 text-xs">Batal</button></>
                      ) : (
                        <><button onClick={() => setEditing(s)} className="rounded-lg border px-3 py-1 text-xs hover:bg-slate-50">Edit</button><button onClick={() => toggleActive(s)} className="rounded-lg border px-3 py-1 text-xs hover:bg-slate-50">{s.isActive ? "Nonaktifkan" : "Aktifkan"}</button><button onClick={() => handleDelete(s)} className="rounded-lg bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">Hapus</button></>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
