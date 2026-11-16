"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Cpu,
  Flag,
  Gamepad2,
  Shirt,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { segmentsApi, usersApi } from "@/lib/api";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  NumberTicker,
  SpotlightCard,
  InfiniteMarquee,
} from "@/components/ui/animated-primitives";

const HIGHLIGHTS = [
  {
    icon: Flag,
    title: "Rag Batch Celebration",
    kicker: "PROJONMO '23",
    body: "Grand campus rally, Color Fest, Flash Mob, and Cultural Finale Night.",
    accent: "from-violet-500 to-fuchsia-400",
  },
  {
    icon: Cpu,
    title: "Build & Compete Arenas",
    kicker: "Engineering",
    body: "Intra-NUBTK Speed Programming Contest, AI & Full-Stack Project Showcase, and Poster Presentation.",
    accent: "from-indigo-500 to-cyan-400",
  },
  {
    icon: Gamepad2,
    title: "E-Sports & Mind Sports",
    kicker: "Arenas",
    body: "eFootball 2026 1v1 Championship, Rapid Chess Arena, and Female Indoor Games.",
    accent: "from-cyan-400 to-emerald-400",
  },
  {
    icon: Shirt,
    title: "Official Fest Kit & Perks",
    kicker: "Participants",
    body: "Custom PROJONMO '23 dry-fit jersey (S–XXL), Digital Fest Pass, and Grand Fest Feast.",
    accent: "from-amber-400 to-orange-400",
  },
];

const MARQUEE_ITEMS = [
  "PROJONMO '23 RAG BATCH",
  "SPEED PROGRAMMING CONTEST",
  "AI & SOFTWARE PROJECT SHOWCASE",
  "EFOOTBALL 2026 CHAMPIONSHIP",
  "RAPID CHESS ARENA",
  "COLOR FEST & GRAND RALLY",
  "CULTURAL FINALE NIGHT",
  "OFFICIAL PROJONMO '23 JERSEY",
];

export default function LandingPage() {
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => {
    setHasToken(typeof window !== "undefined" && !!localStorage.getItem("accessToken"));
  }, []);

  const { data: user } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => usersApi.getMe(),
    enabled: hasToken,
    retry: false,
  });

  const { data: segments, isLoading: segmentsLoading } = useQuery({
    queryKey: ["segments"],
    queryFn: () => segmentsApi.getAll(),
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 font-sans text-white">
      <Navbar />

      {/* 1. Animated Dark Obsidian Hero */}
      <section className="relative overflow-hidden bg-slate-950 text-white pt-16 pb-20">
        {/* Drifting Spotlight Orb 1 */}
        <motion.div
          className="pointer-events-none absolute -left-24 -top-24 size-[520px] rounded-full bg-indigo-600/20 blur-[130px]"
          animate={{
            x: [0, 35, -25, 0],
            y: [0, -30, 20, 0],
            scale: [1, 1.08, 0.95, 1],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Drifting Spotlight Orb 2 */}
        <motion.div
          className="pointer-events-none absolute -right-24 top-16 size-[480px] rounded-full bg-cyan-500/15 blur-[140px]"
          animate={{
            x: [0, -35, 25, 0],
            y: [0, 30, -20, 0],
            scale: [1, 0.95, 1.08, 1],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Technical Grid Overlay */}
        <div className="pointer-events-none absolute inset-0 tech-grid-dark opacity-60" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            {/* Hero Badge */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-200 shadow-[0_0_24px_rgba(99,102,241,0.25)] backdrop-blur-md"
            >
              <span>✨ Hosted by Rag Batch PROJONMO &apos;23 • Dept. of CSE, NUBTK</span>
            </motion.div>

            {/* Giant Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl"
            >
              <span className="bg-gradient-to-r from-indigo-300 via-violet-200 to-cyan-300 bg-clip-text text-transparent">
                PROJONMO &apos;23
              </span>
              <span className="mt-2 block text-white">NUBTK CSE FEST 2026</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
              className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg"
            >
              Where 38 academic sections unite. Official department portal for whitelisted student
              verification, transparent section fee collection, and solo &amp; team championship arenas.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-95"
                  >
                    <span>Go to My Dashboard ({user.name.split(" ")[0]})</span>
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="#contests"
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-5 text-sm font-semibold text-slate-200 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                  >
                    Browse Contests
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-95"
                  >
                    <span>Verify Student ID &amp; Register</span>
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-5 text-sm font-semibold text-slate-200 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                  >
                    Sign In to Portal
                  </Link>
                </>
              )}
            </motion.div>
          </div>

          {/* 4 Frosted Glass Stat Cards */}
          <motion.div
            id="sections"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
            className="mt-14 grid scroll-mt-24 grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-none ring-1 ring-white/10 backdrop-blur-md transition hover:bg-white/[0.08]">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-1">
                <NumberTicker value={38} />
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-1">CSE Sections</div>
              <div className="mt-0.5 text-xs text-slate-400">Semesters 1 to 8</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-none ring-1 ring-white/10 backdrop-blur-md transition hover:bg-white/[0.08]">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-1">
                <NumberTicker value={1253} />
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-1">Whitelisted Students</div>
              <div className="mt-0.5 text-xs text-slate-400">Whitelisted CSE Roster</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-none ring-1 ring-white/10 backdrop-blur-md transition hover:bg-white/[0.08]">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-1">
                <NumberTicker value={13} />
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-1">Committees</div>
              <div className="mt-0.5 text-xs text-slate-400">Led by Projonmo &apos;23</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-none ring-1 ring-white/10 backdrop-blur-md transition hover:bg-white/[0.08]">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-1">
                <NumberTicker value={segments?.length || 5} />
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-1">Live Contests</div>
              <div className="mt-0.5 text-xs text-slate-400">Solo &amp; Team Arenas</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Infinite Fest Marquee Strip */}
      <InfiniteMarquee items={MARQUEE_ITEMS} />

      {/* 3. Bento Highlights Grid */}
      <section id="highlights" className="scroll-mt-24 px-4 py-20 sm:px-6 bg-slate-950">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300 mb-3">
              PROJONMO &apos;23 Experience
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Fest Highlights
            </h2>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              From academic competitions to cultural galas, celebrate the pinnacle of NUBTK CSE.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {HIGHLIGHTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <SpotlightCard
                  key={item.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="p-6 sm:p-7 border-slate-800 bg-slate-900/90 text-white flex flex-col justify-between"
                >
                  <div>
                    <div
                      className={`mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-slate-950 font-bold shadow-md shadow-indigo-500/20`}
                    >
                      <Icon className="size-6 text-slate-950" />
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      {item.kicker}
                    </div>
                    <h3 className="mt-1 text-xl font-bold tracking-tight text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      {item.body}
                    </p>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Live Contests & Arenas */}
      <section
        id="contests"
        className="scroll-mt-24 border-t border-slate-800 bg-slate-950 px-4 py-20 sm:px-6"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-300 mb-3">
              Arenas &amp; Tournaments
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Live Contests &amp; Arenas
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Real segments from the department portal. Seats update dynamically from the live roster.
            </p>
          </div>

          {segmentsLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 animate-pulse space-y-4"
                >
                  <div className="h-5 w-32 rounded bg-slate-800" />
                  <div className="h-6 w-3/4 rounded bg-slate-800" />
                  <div className="h-12 w-full rounded bg-slate-800" />
                </div>
              ))}
            </div>
          ) : !segments || segments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/30">
              <Trophy className="mx-auto mb-2 size-8 text-slate-500" />
              <h3 className="font-semibold text-white">No live contests yet</h3>
              <p className="mt-1 text-sm text-slate-400">
                Arenas will appear here as soon as they open.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {segments.map((seg) => {
                const filled = Math.max(0, seg.maxCapacity - seg.seatsLeft);
                const percent = Math.min(
                  100,
                  Math.round((filled / (seg.maxCapacity || 1)) * 100)
                );

                return (
                  <SpotlightCard
                    key={seg.id}
                    className="p-6 sm:p-7 flex flex-col justify-between border-slate-800 bg-slate-900/90 text-white"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                          {seg.category}
                        </span>
                        <span className="rounded-full bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
                          {seg.participationType || "SOLO"}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            seg.registrationFee === 0
                              ? "bg-emerald-500/20 border border-emerald-400/30 text-emerald-300"
                              : "bg-cyan-500/20 border border-cyan-400/30 text-cyan-300"
                          }`}
                        >
                          {seg.registrationFee === 0 ? "FREE" : `${seg.registrationFee} BDT`}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold tracking-tight text-white">{seg.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300 line-clamp-2">
                        {seg.description || "Official CSE Fest competition segment."}
                      </p>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Users className="size-3.5 text-slate-400" />
                            Seats filled ({percent}%)
                          </span>
                          <span className="font-semibold text-slate-200">
                            {seg.seatsLeft} of {seg.maxCapacity} seats left
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${percent}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                          />
                        </div>
                      </div>

                      <Link
                        href={user ? `/dashboard/events/${seg.id}` : "/login"}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:from-indigo-500 hover:to-cyan-500 hover:shadow-indigo-500/30"
                      >
                        <span>Enter Contest Arena -&gt;</span>
                      </Link>
                    </div>
                  </SpotlightCard>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="text-sm font-semibold text-white">
            NUBTK CSE FEST 2026 — PROJONMO &apos;23
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Department of Computer Science &amp; Engineering, Northern University of Business and
            Technology Khulna
          </p>
          <Separator className="my-6 bg-slate-800" />
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/register" className="hover:text-white transition">
              Register
            </Link>
            <Link href="/login" className="hover:text-white transition">
              Sign In
            </Link>
            <Link href="/dashboard" className="hover:text-white transition">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
