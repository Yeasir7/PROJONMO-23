"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Ticket,
  Trophy,
  Banknote,
  PieChart,
  Building2,
  Users,
  Menu,
  X,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { usersApi, authApi, cashHandoversApi, getApiErrorMessage } from "@/lib/api";
import { FestPassTab } from "@/components/dashboard/FestPassTab";
import { EventsTab } from "@/components/dashboard/EventsTab";
import { CRCollectionTab } from "@/components/dashboard/CRCollectionTab";
import { TreasuryTab } from "@/components/dashboard/TreasuryTab";
import { CashInTab } from "@/components/dashboard/CashInTab";
import { CashOutTab } from "@/components/dashboard/CashOutTab";
import { CommitteesTab } from "@/components/dashboard/CommitteesTab";
import { AdminControlsTab } from "@/components/dashboard/AdminControlsTab";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Role, User } from "@/types/fest";

type TabId =
  | "treasury"
  | "cr"
  | "section"
  | "admin"
  | "cash-in"
  | "cash-out"
  | "committees"
  | "events";

interface AdminNavItem {
  id: TabId;
  label: string;
  icon: React.ElementType;
  badge?: (pendingCount: number) => React.ReactNode;
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: "treasury",
    label: "Overview & Treasury",
    icon: PieChart,
  },
  {
    id: "admin",
    label: "Students, Sections & Fees",
    icon: Users,
  },
  {
    id: "cash-in",
    label: "Cash In",
    icon: ArrowDownLeft,
    badge: (pendingCount: number) =>
      pendingCount > 0 ? (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400 text-slate-950 shrink-0">
          {pendingCount}
        </span>
      ) : null,
  },
  {
    id: "cash-out",
    label: "Cash Out",
    icon: ArrowUpRight,
  },
  {
    id: "committees",
    label: "13 Committees & Teams",
    icon: Building2,
  },
  {
    id: "events",
    label: "Events & Contests",
    icon: Trophy,
  },
];

function getInitials(name?: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch Current Logged-in User
  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => usersApi.getMe(),
    retry: false,
  });

  const [activeTab, setActiveTab] = useState<TabId>("treasury");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "CONVENOR";

  // Live query for pending cash handovers (for live amber badge in admin sidebar)
  const { data: handoversResponse } = useQuery({
    queryKey: ["cashHandovers", "pending-count"],
    queryFn: () => cashHandoversApi.getAll({ status: "PENDING", limit: 2000 }),
    enabled: !!isAdmin,
    refetchInterval: 10000,
  });

  const pendingHandoversCount =
    handoversResponse?.data?.filter((h) => h.status === "PENDING").length || 0;

  // Set default tab based on query param or role
  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      if (search.get("profile") === "open" || search.get("tab") === "pass") {
        setIsProfileModalOpen(true);
      }
      const tabParam = search.get("tab") as TabId | null;
      if (
        tabParam &&
        [
          "treasury",
          "cr",
          "section",
          "admin",
          "cash-in",
          "cash-out",
          "committees",
          "events",
        ].includes(tabParam)
      ) {
        setActiveTab(tabParam === "section" ? "cr" : tabParam);
        return;
      }
    }

    if (user) {
      if (user.role === "STUDENT") {
        setActiveTab("events");
      } else if (user.role === "CR") {
        setActiveTab("cr");
      } else {
        setActiveTab("treasury");
      }
    }
  }, [user]);

  // Unauthorized redirect
  useEffect(() => {
    if (userError) {
      toast.error("Session expired or unauthorized. Please sign in.");
      router.push("/login");
    }
  }, [userError, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
      }
      await authApi.logout();
      queryClient.clear();
      toast.success("Signed out successfully");
      router.push("/login");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to log out"));
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <div className="text-xs font-mono text-slate-500">
          Loading Campus Gather dashboard...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] min-w-0 w-full max-w-full overflow-x-hidden">
      {/* ─── PROFILE CENTERED MODAL ───────────────────────── */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0 bg-white border-slate-200 shadow-2xl"
        >
          {/* Sticky top header inside modal */}
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-[10px]">
                P23
              </div>
              <span className="text-sm font-bold text-slate-900">
                My Profile
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(false)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
            >
              <X className="h-5 w-5 text-slate-600" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          <DialogHeader className="sr-only">
            <DialogTitle>My Profile</DialogTitle>
            <DialogDescription>
              Manage personal profile details and festival preferences.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 sm:p-6">
            <FestPassTab user={user} />
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── CONDITIONAL LAYOUT: ADMIN VS CR / STUDENT ────────────────── */}
      {isAdmin ? (
        /* ══════════════════════════════════════════════════════════════════
           ADMIN LAYOUT: DARK SIDEBAR (lg+) + MOBILE/TABLET SLIDE-OVER (<lg)
           ══════════════════════════════════════════════════════════════════ */
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row min-w-0 w-full max-w-full overflow-x-hidden">
          {/* Desktop Fixed Left Sidebar (w-64 on lg+) */}
          <aside className="hidden lg:flex w-64 shrink-0 bg-slate-950 text-slate-300 border-r border-slate-800 flex-col justify-between fixed inset-y-0 z-40 select-none">
            {/* Brand Header */}
            <div>
              <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
                <Link href="/" className="flex items-center gap-2.5 group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-slate-950 text-xs shadow-sm">
                    P23
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold tracking-wider text-indigo-300 uppercase">
                      PROJONMO &apos;23
                    </div>
                    <div className="font-extrabold text-sm text-white tracking-tight leading-tight">
                      CSE FEST
                    </div>
                  </div>
                </Link>
              </div>

              {/* Navigation Items */}
              <nav className="px-3 py-5 space-y-1 overflow-y-auto">
                <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Administration &amp; Operations
                </div>
                {ADMIN_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const badgeContent = item.badge ? item.badge(pendingHandoversCount) : null;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`flex w-full items-center justify-between whitespace-nowrap px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? "text-white" : "text-slate-400"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {badgeContent}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar Bottom Footer: Clickable Profile Button + Sign Out */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/70">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-left hover:border-indigo-500/60 hover:bg-slate-900 transition cursor-pointer"
              >
                <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-semibold text-white">{user.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase shrink-0 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {user.role}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 truncate">
                    {user.studentId || user.email}
                  </div>
                  <div className="text-[11px] font-medium text-indigo-400 mt-0.5">
                    My Profile -&gt;
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full mt-2.5 py-2 px-3 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-800/80 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </aside>

          {/* Main Content Area (Offset by 256px on lg+) */}
          <div className="flex-1 lg:pl-64 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden">
            {/* Top Header for Admin View */}
            <header className="sticky top-0 z-30 h-16 bg-slate-950 text-white border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between">
              {/* Left Title / Branding */}
              <div className="flex items-center gap-3">
                <Link href="/" className="lg:hidden flex items-center gap-2 shrink-0">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 font-mono text-xs font-black text-slate-950 flex items-center justify-center shadow-sm">
                    P23
                  </div>
                  <span className="text-sm font-extrabold tracking-tight text-white whitespace-nowrap">
                    CSE FEST
                  </span>
                </Link>

                <div className="hidden lg:flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wide">
                    {ADMIN_NAV_ITEMS.find((n) => n.id === activeTab)?.label || "Dashboard"}
                  </span>
                </div>
              </div>

              {/* Right Admin Header Controls */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  title={`${user.name} (${user.role}) — My Profile`}
                  aria-label="Open My Profile"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white ring-2 ring-indigo-400/30 hover:bg-indigo-500 hover:ring-indigo-400/60 transition cursor-pointer"
                >
                  {getInitials(user.name)}
                </button>

                {/* Mobile/Tablet Hamburger Button (< lg) */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 transition cursor-pointer"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </header>

            {/* Mobile/Tablet Navigation Drawer (< lg) */}
            {mobileMenuOpen && (
              <div className="lg:hidden border-b border-slate-800 bg-slate-950 px-4 py-4 space-y-1.5 shadow-2xl">
                <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Admin Navigation
                </div>
                {ADMIN_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const badgeContent = item.badge ? item.badge(pendingHandoversCount) : null;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between whitespace-nowrap px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {badgeContent}
                    </button>
                  );
                })}

                <div className="h-px bg-slate-800 my-2" />

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between whitespace-nowrap px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-slate-800 text-indigo-300 bg-slate-900/90"
                >
                  <div className="flex items-center gap-2.5">
                    <Ticket className="w-4 h-4 text-cyan-400" />
                    <span>My Profile</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <LogOut className="size-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            {/* Dynamic Admin Tab Body */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0 max-w-full overflow-x-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  {activeTab === "treasury" && <TreasuryTab />}
                  {activeTab === "admin" && <AdminControlsTab currentUser={user} />}
                  {activeTab === "cash-in" && <CashInTab currentUser={user} />}
                  {activeTab === "cash-out" && <CashOutTab currentUser={user} />}
                  {activeTab === "committees" && <CommitteesTab currentUser={user} />}
                  {activeTab === "events" && <EventsTab currentUser={user} />}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════
           CR & STUDENT LAYOUT: SLEEK FULL-WIDTH TOP HEADER (NO EMPTY SIDEBAR)
           ══════════════════════════════════════════════════════════════════ */
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col min-w-0 w-full max-w-full overflow-x-hidden">
          {/* Top Navigation Header */}
          <header className="sticky top-0 z-40 w-full bg-slate-950 text-white border-b border-slate-800">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
              {/* Left Brand + Desktop-Only Navigation Tabs */}
              <div className="flex items-center gap-3 sm:gap-6 min-w-0 shrink-0">
                <Link href="/" className="flex items-center gap-2.5 shrink-0">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 font-mono text-xs font-black text-slate-950 flex items-center justify-center shadow-sm">
                    P23
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold tracking-tight text-white whitespace-nowrap">
                      NUBTK CSE FEST
                    </span>
                    <span className="hidden sm:inline-flex rounded-full bg-indigo-500/20 border border-indigo-400/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                      PROJONMO &apos;23
                    </span>
                  </div>
                </Link>

                {/* Inline Nav Tabs (Desktop Only: hidden md:flex) */}
                <nav className="hidden md:flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("cr")}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "cr" || activeTab === "section"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Banknote className="size-3.5" />
                    <span>My Section ({user.section?.code || "Section"})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("events")}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "events"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Trophy className="size-3.5" />
                    <span>Events &amp; Contests</span>
                  </button>
                </nav>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                {/* Circular Profile Avatar Button */}
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  title={`${user.name} (${user.role}) — My Profile`}
                  aria-label="Open My Profile"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white ring-2 ring-indigo-400/30 hover:bg-indigo-500 hover:ring-indigo-400/60 transition cursor-pointer"
                >
                  {getInitials(user.name)}
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-950/50 transition cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
                </button>

                {/* Mobile Hamburger Menu Button (md:hidden) */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 transition cursor-pointer"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Mobile Menu Panel directly under sticky header */}
            {mobileMenuOpen && (
              <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 py-4 space-y-2 shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("cr");
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition cursor-pointer ${
                    activeTab === "cr" || activeTab === "section"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Banknote className="size-4 text-indigo-400" />
                  <span>My Section ({user.section?.code || "Section"})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("events");
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition cursor-pointer ${
                    activeTab === "events"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Trophy className="size-4 text-indigo-400" />
                  <span>Events &amp; Contests</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer border border-slate-800 bg-slate-900/60"
                >
                  <Ticket className="size-4 text-cyan-400" />
                  <span>My Profile</span>
                </button>

                <div className="h-px bg-slate-800 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void handleLogout();
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <LogOut className="size-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </header>

          {/* Main Centered Content */}
          <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0 overflow-x-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {(activeTab === "cr" || activeTab === "section") && (
                  <CRCollectionTab currentUser={user} />
                )}
                {activeTab === "events" && <EventsTab currentUser={user} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      )}
    </div>
  );
}
