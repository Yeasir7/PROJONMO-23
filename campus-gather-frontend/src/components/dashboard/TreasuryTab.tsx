"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Wallet,
  CheckCheck,
  Clock,
  Banknote,
  TrendingUp,
  CreditCard,
  Users,
  CheckCircle2,
  Building2,
  Shirt,
  Trophy,
} from "lucide-react";
import { analyticsApi, committeesApi } from "@/lib/api";
import { TshirtMatrixCard } from "./TshirtMatrixCard";

export function TreasuryTab() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => analyticsApi.getSummary(),
  });

  const { data: committees, isLoading: committeesLoading } = useQuery({
    queryKey: ["committees"],
    queryFn: () => committeesApi.getAll(),
  });

  if (summaryLoading || committeesLoading) {
    return (
      <div className="p-12 text-center bg-white border border-[#E2E8F0] rounded-2xl shadow-xs">
        <div className="inline-block w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mb-2" />
        <div className="text-xs text-slate-500 font-mono">Aggregating real-time treasury analytics...</div>
      </div>
    );
  }

  // T-Shirt data formatting
  const tshirtChartData = (summary?.tshirtBreakdown || []).map((item) => ({
    size: item.tshirtSize,
    count: item._count._all,
  }));

  // Committee budget vs spent formatting
  const committeeChartData = (committees || []).map((comm) => ({
    name: comm.name.length > 14 ? `${comm.name.slice(0, 12)}...` : comm.name,
    fullName: comm.name,
    Allocated: comm.allocatedBudget,
    Spent: comm.totalSpent,
  }));

  return (
    <div className="space-y-6">
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Overview & Festival Treasury
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial reconciliation, committee disbursements, and participant statistics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#059669] border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
            Ledger Reconciled
          </span>
        </div>
      </div>

      {/* ─── KPI CARDS ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance (Featured Card) */}
        <div className="sm:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white border border-indigo-900/60 shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 rounded-full bg-[#2563EB]/10 pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-medium text-indigo-300">
            <span>Available Balance (Vault Cash + Inflows + Contests − Expenses)</span>
            <Wallet className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-4xl font-extrabold text-white mt-2 tracking-tight">
            {(summary?.availableBalance ?? 0).toLocaleString()} <span className="text-xl font-normal text-indigo-300">BDT</span>
          </div>
          <p className="text-xs text-indigo-200/70 mt-2">
            Increases when Convenor verifies CR cash handovers, logs inflows, or collects paid contest entry fees.
          </p>
        </div>

        {/* Contest Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Contest Entry Revenue</span>
            <Trophy className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-2">
            {(summary?.totalContestRevenue ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">BDT</span>
          </div>
          <div className="text-[11px] text-purple-600 mt-1 font-medium">Paid contest registrations</div>
        </div>

        {/* Verified Cash */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Verified Cash in Vault</span>
            <CheckCheck className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {(summary?.totalVerifiedByConvenor ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">BDT</span>
          </div>
          <div className="text-[11px] text-[#059669] mt-1 font-medium">Audited & deposited</div>
        </div>

        {/* Pending Handovers */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Pending Handovers</span>
            <Clock className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-bold text-[#D97706] mt-2">
            {(summary?.totalPendingHandover ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">BDT</span>
          </div>
          <div className="text-[11px] text-[#D97706] mt-1 font-medium">Awaiting physical audit</div>
        </div>

        {/* Collected by CRs */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Collected by CRs</span>
            <Banknote className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {(summary?.totalCollectedByCRs ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">BDT</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Gross student collections</div>
        </div>

        {/* Sponsor/Dept Inflows */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Sponsor/Dept Inflows</span>
            <TrendingUp className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-bold text-[#059669] mt-2">
            {(summary?.totalInflows ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">BDT</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">External sponsorships & fund</div>
        </div>

        {/* Total Expenses */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Expenses</span>
            <CreditCard className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            {(summary?.totalExpenses ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">BDT</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Approved committee vouchers</div>
        </div>

        {/* Registered Students / Paid */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Registered Students / Paid</span>
            <Users className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-bold text-[#2563EB] mt-2">
            {summary?.totalPaidStudents ?? 0} <span className="text-xs font-normal text-slate-400">/ {summary?.totalStudents ?? 0}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary?.totalStudents
              ? Math.round(((summary.totalPaidStudents || 0) / summary.totalStudents) * 100)
              : 0}% paid participation
          </div>
        </div>
      </div>

      {/* ─── LIVE T-SHIRT FACTORY ORDER & INVENTORY MATRIX ───────────────── */}
      <TshirtMatrixCard analytics={summary} />

      {/* ─── 13 COMMITTEES BUDGET VS SPENT CHART ─────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              13 Committees Budget vs. Spent
            </h3>
            <p className="text-xs text-slate-500">
              Expenditure tracked against allocated budgets (in BDT)
            </p>
          </div>
          <Building2 className="w-5 h-5 text-slate-400" />
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={committeeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#64748b" }}
                interval={0}
                angle={-20}
                textAnchor="end"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickFormatter={(val) => `${val / 1000}k`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1">
                        <div className="font-bold text-sm text-white">{data.fullName}</div>
                        <div className="text-slate-300">
                          Allocated: <strong className="text-white">{data.Allocated.toLocaleString()} BDT</strong>
                        </div>
                        <div className="text-indigo-400">
                          Spent: <strong>{data.Spent.toLocaleString()} BDT</strong>
                        </div>
                        <div className="text-[#059669]">
                          Remaining: <strong>{(data.Allocated - data.Spent).toLocaleString()} BDT</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }} />
              <Bar dataKey="Allocated" fill="#94A3B8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Spent" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
