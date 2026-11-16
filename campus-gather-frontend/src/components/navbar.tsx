"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Ticket,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";
import { authApi, getApiErrorMessage, usersApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV_LINKS = [
  { href: "/#highlights", label: "Highlights" },
  { href: "/#contests", label: "Live Contests" },
  { href: "/#sections", label: "Sections" },
];

export function Navbar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [hasToken, setHasToken] = useState(false);
  useEffect(() => {
    setHasToken(typeof window !== "undefined" && !!localStorage.getItem("accessToken"));
  }, []);

  const { data: user, isLoading } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => usersApi.getMe(),
    enabled: hasToken,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        setIsMobileNavOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleSignOut = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
      }
      setHasToken(false);
      await authApi.logout();
      queryClient.clear();
      toast.success("Signed out successfully");
      router.push("/login");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to sign out"));
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "P23";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Left Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 font-mono text-sm font-black text-slate-950 shadow-md shadow-indigo-500/20">
            P23
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-white whitespace-nowrap">
              NUBTK CSE FEST
            </span>
            <span className="hidden sm:inline-flex w-fit items-center rounded-full bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
              PROJONMO &apos;23
            </span>
          </div>
        </Link>

        {/* Center Nav Links (Desktop: hidden md:flex) */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-3.5 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800/80 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Right Actions (hidden md:flex) */}
        <div className="hidden md:flex items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-28 animate-pulse rounded-xl bg-slate-800/60" />
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
              >
                <LayoutDashboard className="size-4 text-indigo-400" />
                <span>Dashboard</span>
              </Link>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  title={`${user.name} (${user.role}) — My Fest Pass & Profile`}
                  aria-label="Open My Fest Pass and Profile"
                  aria-expanded={isMenuOpen}
                  aria-haspopup="menu"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white ring-2 ring-indigo-400/30 hover:bg-indigo-500 hover:ring-indigo-400/60 transition cursor-pointer"
                >
                  {initials}
                </button>

                {isMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-800 bg-slate-950/95 p-2 text-white shadow-2xl backdrop-blur-xl"
                  >
                    <div className="space-y-1 px-3 py-2.5">
                      <div className="text-sm font-semibold leading-tight text-white">{user.name}</div>
                      <div className="truncate text-xs text-slate-400">{user.email}</div>
                      <div className="flex flex-wrap items-center gap-2 pt-1.5 text-[11px] text-slate-400">
                        {user.studentId && (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5">ID: {user.studentId}</span>
                        )}
                        {user.section?.code && (
                          <span className="rounded bg-indigo-950/80 text-indigo-300 px-1.5 py-0.5">
                            Sec {user.section.code}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="my-1.5 h-px bg-slate-800/80" />
                    <Link
                      href="/dashboard?profile=open"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
                    >
                      <Ticket className="size-4 text-cyan-400" />
                      <span>My Profile</span>
                    </Link>
                    <div className="my-1.5 h-px bg-slate-800/80" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        void handleSignOut();
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                    >
                      <LogOut className="size-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 hover:opacity-95 transition"
              >
                <span>Register</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button (md:hidden) */}
        <div className="flex md:hidden items-center gap-2">
          {user && (
            <Link
              href="/dashboard?profile=open"
              title={`${user.name} (${user.role}) — My Fest Pass & Profile`}
              aria-label="Open My Fest Pass and Profile"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white ring-2 ring-indigo-400/30 hover:bg-indigo-500 hover:ring-indigo-400/60 transition"
            >
              {initials}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 transition cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileNavOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 py-4 space-y-3 shadow-2xl">
          <nav className="flex flex-col space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileNavOpen(false)}
                className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="h-px bg-slate-800" />

          {user ? (
            <div className="space-y-1.5 pt-1">
              <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{user.name}</div>
                  <div className="text-xs text-slate-400 font-mono truncate">{user.studentId || user.email}</div>
                </div>
                <span className="rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                  {user.role}
                </span>
              </div>

              <Link
                href="/dashboard"
                onClick={() => setIsMobileNavOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                <LayoutDashboard className="size-4 text-indigo-400" />
                <span>Dashboard Overview</span>
              </Link>

              <Link
                href="/dashboard?profile=open"
                onClick={() => setIsMobileNavOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                <Ticket className="size-4 text-cyan-400" />
                <span>My Profile</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  void handleSignOut();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
              >
                <LogOut className="size-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <Link
                href="/login"
                onClick={() => setIsMobileNavOpen(false)}
                className="w-full text-center rounded-xl py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 transition border border-slate-800 bg-slate-900/60"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMobileNavOpen(false)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:opacity-95"
              >
                <span>Register</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
