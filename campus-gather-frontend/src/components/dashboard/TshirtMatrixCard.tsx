"use client";

import React from "react";
import { Shirt, CheckCircle2, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { AnalyticsSummary, TshirtSize } from "@/types/fest";

interface TshirtMatrixCardProps {
  analytics?: AnalyticsSummary;
  title?: string;
  subtitle?: string;
}

const ALL_SIZES: TshirtSize[] = ["S", "M", "L", "XL", "XXL"];

export function TshirtMatrixCard({
  analytics,
  title = "T-Shirt Order & Inventory Matrix",
  subtitle = "Registered demand vs confirmed PAID_TO_CR factory print order",
}: TshirtMatrixCardProps) {
  // Build lookup maps
  const registeredMap = new Map<string, number>();
  analytics?.tshirtBreakdown?.forEach((item) => {
    registeredMap.set(item.tshirtSize, item._count?._all ?? 0);
  });

  const paidMap = new Map<string, number>();
  analytics?.paidTshirtBreakdown?.forEach((item) => {
    paidMap.set(item.tshirtSize, item._count?._all ?? 0);
  });

  // Always compute all 5 sizes in exact order
  const matrixData = ALL_SIZES.map((size) => {
    const registered = registeredMap.get(size) ?? 0;
    const paid = paidMap.get(size) ?? 0;

    return {
      size,
      registered,
      paid,
    };
  });

  // Compute Grand Totals
  const grandTotal = matrixData.reduce(
    (acc, row) => ({
      registered: acc.registered + row.registered,
      paid: acc.paid + row.paid,
    }),
    { registered: 0, paid: 0 }
  );

  // Chart data format
  const chartData = matrixData.map((d) => ({
    size: d.size,
    Registered: d.registered,
    "Paid (Order)": d.paid,
  }));

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-6 min-w-0 overflow-hidden">
      {/* ─── CARD HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
              <Shirt className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg tracking-tight">
              {title}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>

        {/* Top 3 KPI Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <div className="text-[11px] leading-tight">
              <span className="text-slate-500">Total Demand: </span>
              <strong className="text-slate-900 font-mono">
                {grandTotal.registered}
              </strong>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
            <div className="text-[11px] leading-tight">
              <span className="text-emerald-700 font-semibold">Factory Order: </span>
              <strong className="text-emerald-900 font-mono">
                {grandTotal.paid} pcs
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MATRIX TABLE & BAR CHART GRID ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 5-Size Production Matrix Table */}
        <div className="lg:col-span-7 w-full overflow-x-auto min-w-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-slate-50/80 text-slate-600 font-semibold">
                <th className="py-2.5 px-3 rounded-l-lg">Size</th>
                <th className="py-2.5 px-3 text-center">Registered (Demand)</th>
                <th className="py-2.5 px-3 text-right text-[#059669] bg-emerald-50/40 rounded-r-lg">
                  Paid & Confirmed (Order)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] font-medium text-slate-700">
              {matrixData.map((row) => (
                <tr key={row.size} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg">
                      {row.size}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">
                    {row.registered}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-[#059669] bg-emerald-50/30">
                    {row.paid}
                  </td>
                </tr>
              ))}

              {/* Grand Total Row */}
              <tr className="bg-slate-100/80 font-bold border-t-2 border-[#E2E8F0] text-slate-900">
                <td className="py-3 px-3 uppercase tracking-wider text-xs font-mono">
                  TOTAL
                </td>
                <td className="py-3 px-3 text-center font-mono text-slate-900">
                  {grandTotal.registered}
                </td>
                <td className="py-3 px-3 text-right font-mono text-[#059669] bg-emerald-100/50">
                  {grandTotal.paid} pcs
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-[11px] text-slate-400 mt-2 italic">
            * Factory production count matches confirmed paid registrations (<strong className="font-semibold text-slate-600">PAID_TO_CR</strong>).
          </p>
        </div>

        {/* Right: Comparative Multi-Bar Chart with all 5 sizes */}
        <div className="lg:col-span-5 bg-slate-50/60 border border-[#E2E8F0] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700">
              Comparative Size Distribution
            </span>
            <span className="text-[10px] font-mono text-slate-400">All 5 Sizes</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="size"
                  tick={{ fontSize: 11, fill: "#334155", fontWeight: 700 }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg text-xs space-y-1 font-mono">
                          <div className="font-bold text-blue-300 font-sans border-b border-slate-700 pb-1">
                            Size: {d.size}
                          </div>
                          <div className="text-slate-300">
                            Registered: <strong className="text-white">{d.Registered}</strong>
                          </div>
                          <div className="text-emerald-400">
                            Paid (Order): <strong>{d["Paid (Order)"]}</strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: "10px", paddingBottom: "6px" }}
                />
                <Bar
                  dataKey="Registered"
                  fill="#94A3B8"
                  radius={[3, 3, 0, 0]}
                  name="Registered"
                />
                <Bar
                  dataKey="Paid (Order)"
                  fill="#059669"
                  radius={[3, 3, 0, 0]}
                  name="Paid (Order)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
