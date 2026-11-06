"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Zap,
  Home,
  Calendar,
  User,
  Star,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  LogIn,
  Sparkles,
  ChevronDown,
  Menu,
  X,
  Users,
} from "lucide-react";

type User = {
  role: string;
  id: string;
  name: string;
  email?: string;
  points?: number;
};

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pathname]);

  const handleLogout = async () => {
    const endpoint = user?.role === "admin"
      ? "/api/auth/admin/logout"
      : user?.role === "owner"
      ? "/api/auth/owner/logout"
      : "/api/auth/customer/logout";
    await fetch(endpoint, { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

  const isAdminPage = pathname.startsWith("/admin");

  if (isAdminPage) return null;

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <Zap className="h-5 w-5 text-orange-400" aria-hidden="true" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">
              Lapa<span className="text-blue-800">book</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/" active={pathname === "/"}>
              <Home className="h-4 w-4" aria-hidden="true" /> Beranda
            </NavLink>
            <NavLink href="/booking/futsal" active={pathname.startsWith("/booking")}>
              <Calendar className="h-4 w-4" aria-hidden="true" /> Booking
            </NavLink>
            <NavLink href="/mabar" active={pathname.startsWith("/mabar")}>
              <Users className="h-4 w-4" aria-hidden="true" /> Mabar
            </NavLink>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="w-20 h-9 bg-gray-100 rounded-lg animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                {user.role === "customer" && user.points !== undefined && (
                  <Link
                    href="/profile"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden="true" />
                    {user.points.toLocaleString()} Poin
                  </Link>
                )}
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-800 font-bold text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user.name}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  </button>
                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    {user.role === "customer" && (
                      <>
                        <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <User className="h-4 w-4" aria-hidden="true" /> Profil Saya
                        </Link>
                        <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Star className="h-4 w-4" aria-hidden="true" /> Riwayat Poin
                        </Link>
                        <Link href="/profile/bookings" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <ClipboardList className="h-4 w-4" aria-hidden="true" /> Booking Saya
                        </Link>
                        <Link href="/profile/mabar" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Users className="h-4 w-4" aria-hidden="true" /> Mabar Saya
                        </Link>
                      </>
                    )}
                    {user.role === "admin" && (
                      <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Dashboard Admin
                      </Link>
                    )}
                    {user.role === "owner" && (
                      <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Dashboard Owner
                      </Link>
                    )}
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" /> Keluar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-800 transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors shadow-sm"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          >
            {mobileOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            <MobileNavLink href="/" onClick={() => setMobileOpen(false)}>
              <Home className="h-4 w-4" aria-hidden="true" /> Beranda
            </MobileNavLink>
            <MobileNavLink href="/booking/futsal" onClick={() => setMobileOpen(false)}>
              <Calendar className="h-4 w-4" aria-hidden="true" /> Booking Lapangan
            </MobileNavLink>
            <MobileNavLink href="/mabar" onClick={() => setMobileOpen(false)}>
              <Users className="h-4 w-4" aria-hidden="true" /> Mabar
            </MobileNavLink>

            {user ? (
              <>
                <hr className="my-2 border-gray-100" />
                {user.role === "customer" && user.points !== undefined && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden="true" />
                    <span className="text-sm font-semibold text-amber-700">
                      {user.points.toLocaleString()} Poin
                    </span>
                  </div>
                )}
                {user.role === "customer" && (
                  <>
                    <MobileNavLink href="/profile" onClick={() => setMobileOpen(false)}>
                      <User className="h-4 w-4" aria-hidden="true" /> Profil Saya
                    </MobileNavLink>
                    <MobileNavLink href="/profile/bookings" onClick={() => setMobileOpen(false)}>
                      <ClipboardList className="h-4 w-4" aria-hidden="true" /> Booking Saya
                    </MobileNavLink>
                    <MobileNavLink href="/profile/mabar" onClick={() => setMobileOpen(false)}>
                      <Users className="h-4 w-4" aria-hidden="true" /> Mabar Saya
                    </MobileNavLink>
                  </>
                )}
                {user.role === "admin" && (
                  <MobileNavLink href="/admin" onClick={() => setMobileOpen(false)}>
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Dashboard Admin
                  </MobileNavLink>
                )}
                {user.role === "owner" && (
                  <MobileNavLink href="/dashboard" onClick={() => setMobileOpen(false)}>
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Dashboard Owner
                  </MobileNavLink>
                )}
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="w-full flex items-center gap-2 text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" /> Keluar
                </button>
              </>
            ) : (
              <>
                <hr className="my-2 border-gray-100" />
                <MobileNavLink href="/login" onClick={() => setMobileOpen(false)}>
                  <LogIn className="h-4 w-4" aria-hidden="true" /> Masuk
                </MobileNavLink>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg mt-2"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> Daftar Sekarang
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-blue-50 text-blue-800"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
    >
      {children}
    </Link>
  );
}
