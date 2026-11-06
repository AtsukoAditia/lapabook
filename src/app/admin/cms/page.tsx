"use client";

import { useEffect, useState } from "react";
import { Info, Lock, ClipboardList, Phone, CheckCircle2, FileText, Save, Pencil, type LucideIcon } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

interface CmsPage {
  key: string;
  title: string;
  body: string;
  updatedAt: string;
  updatedBy: string | null;
}

const AVAILABLE_PAGES: { key: string; label: string; icon: LucideIcon; description: string }[] = [
  { key: "tentang", label: "Tentang", icon: Info, description: "Halaman tentang Lapabook" },
  { key: "kebijakan", label: "Kebijakan & Privasi", icon: Lock, description: "Kebijakan privasi pengguna" },
  { key: "syarat", label: "Syarat & Ketentuan", icon: ClipboardList, description: "Syarat ketentuan penggunaan" },
  { key: "kontak", label: "Kontak", icon: Phone, description: "Informasi kontak" },
];

export default function AdminCmsPage() {
  const [pages, setPages] = useState<Record<string, CmsPage>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  function fetchPages() {
    fetch("/api/admin/cms")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.data) setPages(data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchPages();
  }, []);

  function startEditing(key: string) {
    const page = pages[key];
    setEditing(key);
    setEditTitle(page?.title || "");
    setEditBody(page?.body || "");
    setSaved(false);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: editing, title: editTitle, body: editBody }),
      });
      if (res.ok) {
        setSaved(true);
        fetchPages();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Gagal menyimpan");
      }
    } catch {
      alert("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  const currentLabel = AVAILABLE_PAGES.find((p) => p.key === editing)?.label || "";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">CMS — Halaman Statis</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola konten halaman Tentang, Kebijakan, Syarat, dan Kontak (tersimpan di database)</p>
        </div>

        {!editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_PAGES.map((p) => {
              const page = pages[p.key];
              const hasContent = !!page?.body;
              return (
                <button
                  key={p.key}
                  onClick={() => startEditing(p.key)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-left hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <p.icon aria-hidden={true} className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{p.label}</h3>
                      <p className="text-xs text-gray-500">{p.description}</p>
                    </div>
                    <span
                      className={`ml-auto inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                        hasContent ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {hasContent ? (
                        <><CheckCircle2 aria-hidden={true} className="h-3.5 w-3.5" /> Custom</>
                      ) : loading ? (
                        "…"
                      ) : (
                        <><FileText aria-hidden={true} className="h-3.5 w-3.5" /> Default</>
                      )}
                    </span>
                  </div>
                  {page?.updatedAt && (
                    <p className="text-xs text-gray-400">
                      Terakhir diubah: {new Date(page.updatedAt).toLocaleDateString("id-ID")}
                      {page.updatedBy ? ` oleh ${page.updatedBy}` : ""}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-700 font-medium">
                ← Kembali
              </button>
              <h2 className="text-lg font-bold text-gray-900">Edit: {currentLabel}</h2>
              <button
                onClick={handleSave}
                disabled={saving}
                className="ml-auto px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  {saving ? "Menyimpan..." : saved ? (
                    <><CheckCircle2 aria-hidden={true} className="h-4 w-4" /> Tersimpan</>
                  ) : (
                    <><Save aria-hidden={true} className="h-4 w-4" /> Simpan</>
                  )}
                </span>
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Judul Halaman</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder={`Judul halaman ${currentLabel}`}
              />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Pencil aria-hidden={true} className="h-5 w-5 text-emerald-600" /> Konten Halaman
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Format: Markdown. Gunakan # untuk heading, ## untuk subheading, - untuk list, **teks** untuk bold.
              </p>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={25}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Tulis konten halaman di sini..."
              />
              <p className="text-xs text-gray-400 mt-2">{editBody.length} karakter</p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
