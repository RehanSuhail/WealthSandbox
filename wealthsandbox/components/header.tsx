"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  ChevronDown,
  User,
  LogOut,
  HandshakeIcon,
  Users,
  LayoutDashboard,
  FlaskConical,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "advisor" | "client";

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Read role from cookie
  const [userInfo, setUserInfo] = useState<{ name: string; email: string; role: Role } | null>(null);

  useEffect(() => {
    fetch("/api/auth/login")
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setUserInfo({ name: res.data.name, email: res.data.email, role: res.data.role });
        }
      })
      .catch(() => {});
  }, []);

  const role = userInfo?.role;
  const displayName = userInfo?.name;
  const userInitial = userInfo?.name?.[0]?.toUpperCase() ?? "U";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    document.cookie = "ws_dev_role=;path=/;max-age=0";
    router.push("/login");
  };

  const dashboardHref =
    role === "advisor" ? "/advisor/dashboard" : "/client/dashboard";

  const navLinks: NavLink[] = role === "advisor" ? [
    { href: dashboardHref, label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: "/advisor/clients", label: "Clients", icon: <Users className="w-4 h-4" /> },
    { href: "/advisor/sandboxes", label: "Sandboxes", icon: <FlaskConical className="w-4 h-4" /> },
  ] : [
    { href: dashboardHref, label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: "/sandbox", label: "Sandboxes", icon: <FlaskConical className="w-4 h-4" /> },
    { href: "/insights", label: "Insights", icon: <Lightbulb className="w-4 h-4" /> },
    { href: "/connect", label: "My Advisor", icon: <HandshakeIcon className="w-4 h-4" /> },
  ];

  if (!userInfo) return null;

  return (
    <header className="fixed top-0 left-0 w-full z-50 border-b border-gray-100/80 bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-14 gap-4">

        {/* Logo */}
        <Link href={dashboardHref} className="flex items-center gap-2 font-semibold text-gray-900 shrink-0 hover:opacity-80 transition-opacity">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span>WealthSandbox</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {navLinks.map((link) => {
            const isActive = link.href === dashboardHref
              ? pathname === dashboardHref
              : pathname?.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                  isActive ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                )}
              >
                <span className={cn("transition-colors", isActive ? "text-purple-500" : "text-gray-400")}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Profile dropdown */}
        <div className="flex items-center gap-3 shrink-0">
          <div ref={dropdownRef} className="relative">
            <button onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-2 rounded-full border border-gray-200 pl-1 pr-2.5 py-1 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-semibold select-none">
                {userInitial}
              </span>
              <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">{displayName}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", dropdownOpen && "rotate-180")} />
            </button>

            {dropdownOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white shadow-lg py-1.5 z-50">
                <div className="px-3.5 pb-2 pt-1 mb-1 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{userInfo.email}</p>
                  <span className={cn(
                    "inline-block mt-1.5 text-[10px] font-medium uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                    role === "advisor" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                  )}>
                    {role}
                  </span>
                </div>

                <Link role="menuitem" href="/profile" className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <User className="w-4 h-4 text-gray-400 shrink-0" /> Profile
                </Link>

                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button role="menuitem" onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 shrink-0" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}