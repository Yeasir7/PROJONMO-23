"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  TrendingUp,
  CheckCheck,
  Clock,
  Banknote,
  Plus,
  Search,
  CheckCircle2,
  DollarSign,
  Shield,
  Trash2,
  X,
  Building,
  ArrowDownLeft,
} from "lucide-react";
import {
  cashHandoversApi,
  fundInflowsApi,
  getApiErrorMessage,
} from "@/lib/api";
import type { User, InflowCategory } from "@/types/fest";

export function CashInTab({ currentUser }: { currentUser: User }) {
  const queryClient = useQueryClient();

  const canManage =
    currentUser.role === "SUPER_ADMIN" || currentUser.role === "CONVENOR";

  // State for Handover approvals section
  const [handoverSearch, setHandoverSearch] = useState("");
  const [handoverStatusFilter, setHandoverStatusFilter] = useState("ALL");

  // State for Fund Inflows section
  const [inflowSearch, setInflowSearch] = useState("");
  const [inflowCategoryFilter, setInflowCategoryFilter] = useState("ALL");
  const [isInflowModalOpen, setIsInflowModalOpen] = useState(false);
  const [inflowForm, setInflowForm] = useState({
    sourceTitle: "",
    category: "SPONSOR" as InflowCategory,
    amount: "",
    notes: "",
  });

  // Queries
  const { data: handoversResponse, isLoading: handoversLoading } = useQuery({
    queryKey: ["cashHandovers"],
    queryFn: () => cashHandoversApi.getAll({ limit: 2000 }),
  });

  const { data: inflows, isLoading: inflowsLoading } = useQuery({
    queryKey: ["fundInflows"],
    queryFn: () => fundInflowsApi.getAll(),
  });

  const handovers = handoversResponse?.data || [];
  const safeInflows = inflows || [];

  // Mutations
  const verifyHandoverMutation = useMutation({
    mutationFn: (id: number) => cashHandoversApi.verify(id),
    onSuccess: (res) => {
      toast.success(
        `Handover #${res.id} (${res.amount.toLocaleString()} BDT) verified and deposited to Vault!`
      );
      queryClient.invalidateQueries({ queryKey: ["cashHandovers"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to verify handover"));
    },
  });

  const createInflowMutation = useMutation({
    mutationFn: (data: {
      sourceTitle: string;
      category: InflowCategory;
      amount: number;
      notes?: string;
    }) => fundInflowsApi.create(data),
    onSuccess: () => {
      toast.success("Fund inflow recorded successfully!");
      setIsInflowModalOpen(false);
      setInflowForm({
        sourceTitle: "",
        category: "SPONSOR",
        amount: "",
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["fundInflows"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to log fund inflow"));
    },
  });

  const deleteInflowMutation = useMutation({
    mutationFn: (id: number) => fundInflowsApi.delete(id),
    onSuccess: () => {
      toast.success("Fund inflow entry deleted");
      queryClient.invalidateQueries({ queryKey: ["fundInflows"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to delete fund inflow"));
    },
  });

  const handleCreateInflowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(inflowForm.amount);
    if (!inflowForm.sourceTitle.trim()) {
      toast.error("Source title is required");
      return;
    }
    if (!amt || amt <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    createInflowMutation.mutate({
      sourceTitle: inflowForm.sourceTitle.trim(),
      category: inflowForm.category,
      amount: amt,
      notes: inflowForm.notes.trim() || undefined,
    });
  };

  // Calculations
  const verifiedHandoversAmount = handovers
    .filter((h) => h.status === "VERIFIED")
    .reduce((acc, h) => acc + h.amount, 0);

  const pendingHandovers = handovers.filter((h) => h.status === "PENDING");
  const pendingHandoversAmount = pendingHandovers.reduce(
    (acc, h) => acc + h.amount,
    0
  );

  const totalInflowsAmount = safeInflows.reduce((acc, i) => acc + i.amount, 0);

  const totalVerifiedCashIn = verifiedHandoversAmount + totalInflowsAmount;

  // Filtered lists
  const filteredHandovers = handovers.filter((h) => {
    const matchesStatus =
      handoverStatusFilter === "ALL" || h.status === handoverStatusFilter;
    const q = handoverSearch.toLowerCase();
    const matchesSearch =
      (h.section?.code && h.section.code.toLowerCase().includes(q)) ||
      (h.cr?.name && h.cr.name.toLowerCase().includes(q)) ||
      (h.cr?.studentId && h.cr.studentId.includes(q)) ||
      (h.notes && h.notes.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const filteredInflows = safeInflows.filter((i) => {
    const matchesCat =
      inflowCategoryFilter === "ALL" || i.category === inflowCategoryFilter;
    const q = inflowSearch.toLowerCase();
    const matchesSearch =
      i.sourceTitle.toLowerCase().includes(q) ||
      (i.notes && i.notes.toLowerCase().includes(q)) ||
      (i.receivedBy?.name && i.receivedBy.name.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* ─── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#059669]">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Cash In (Funds & Handovers)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Consolidated portal for all funds entering the fest: Section CR cash handovers and external sponsor & grant funds.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsInflowModalOpen(true)}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Cash In (Sponsor / Dept Fund)
          </button>
        )}
      </div>

      {/* ─── TOP 4 SUMMARY CARDS ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Verified Cash In */}
        <div className="bg-gradient-to-br from-emerald-500 to-[#059669] text-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between opacity-90 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Verified Cash In
            </span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold font-mono tracking-tight">
            {totalVerifiedCashIn.toLocaleString()} <span className="text-xs font-normal">BDT</span>
          </div>
          <div className="text-[11px] opacity-85 mt-1">
            CR Verified ({verifiedHandoversAmount.toLocaleString()}) + Inflows ({totalInflowsAmount.toLocaleString()})
          </div>
        </div>

        {/* Card 2: Verified from Sections (CRs) */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Verified from Sections
            </span>
            <CheckCheck className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {verifiedHandoversAmount.toLocaleString()} <span className="text-xs font-normal text-slate-500">BDT</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Deposited to Treasury Vault by Convenor
          </div>
        </div>

        {/* Card 3: Pending CR Handovers */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pending CR Handovers
            </span>
            <Clock className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-extrabold text-[#D97706] font-mono tracking-tight">
            {pendingHandoversAmount.toLocaleString()} <span className="text-xs font-normal text-slate-500">BDT</span>
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            {pendingHandovers.length} handover{pendingHandovers.length === 1 ? "" : "s"} awaiting physical verification
          </div>
        </div>

        {/* Card 4: External Sponsor & Dept Grants */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Sponsors & Grants
            </span>
            <Building className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {totalInflowsAmount.toLocaleString()} <span className="text-xs font-normal text-slate-500">BDT</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {safeInflows.length} external fund sources recorded
          </div>
        </div>
      </div>

      {/* ─── SECTION A: CR CASH HANDOVER APPROVALS ────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4 min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">
                Section A: CR Cash Handover Approvals
              </h3>
              {pendingHandovers.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-[#D97706] text-[10px] font-bold font-mono">
                  {pendingHandovers.length} Pending
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Physical cash envelopes handed over by section CRs to the Convenor.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search CR, section..."
                value={handoverSearch}
                onChange={(e) => setHandoverSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] font-mono text-slate-900 w-44"
              />
            </div>
            <select
              value={handoverStatusFilter}
              onChange={(e) => setHandoverStatusFilter(e.target.value)}
              className="py-1.5 px-2 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending Only</option>
              <option value="VERIFIED">Verified Only</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-slate-50/70 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Handover #</th>
                <th className="py-2.5 px-3">Section</th>
                <th className="py-2.5 px-3">Handed Over By (CR)</th>
                <th className="py-2.5 px-3 text-right">Amount (BDT)</th>
                <th className="py-2.5 px-3">Handover Notes</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {handoversLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading handovers...
                  </td>
                </tr>
              ) : filteredHandovers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No cash handovers found matching filter.
                  </td>
                </tr>
              ) : (
                filteredHandovers.map((h) => {
                  const isPending = h.status === "PENDING";
                  return (
                    <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                        #{h.id}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-50 text-[#2563EB] rounded-md border border-blue-100">
                          {h.section?.code || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">
                          {h.cr?.name || "Section CR"}
                        </div>
                        {h.cr?.studentId && (
                          <div className="text-[10px] font-mono text-slate-400">
                            {h.cr.studentId}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                        {h.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                        {h.notes || "—"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
                            <Clock className="w-3 h-3" /> PENDING
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200">
                            <CheckCheck className="w-3 h-3" /> VERIFIED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isPending && canManage ? (
                          <button
                            type="button"
                            disabled={verifyHandoverMutation.isPending}
                            onClick={() => verifyHandoverMutation.mutate(h.id)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-[#059669] hover:bg-emerald-700 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1 ml-auto disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verify Cash
                          </button>
                        ) : isPending ? (
                          <span className="text-[11px] text-slate-400 italic">
                            Awaiting Convenor
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-emerald-700">
                            Deposited
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── SECTION B: EXTERNAL FUND INFLOWS ─────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4 min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Section B: External Fund Inflows (Sponsors & Dept Grant)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct institutional subventions, corporate sponsorships, and patron donations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search source title..."
                value={inflowSearch}
                onChange={(e) => setInflowSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] font-mono text-slate-900 w-44"
              />
            </div>
            <select
              value={inflowCategoryFilter}
              onChange={(e) => setInflowCategoryFilter(e.target.value)}
              className="py-1.5 px-2 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Sources</option>
              <option value="SPONSOR">Sponsor</option>
              <option value="DEPT_FUND">Dept Fund</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-slate-50/70 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Source Title</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Amount (BDT)</th>
                <th className="py-2.5 px-3">Received By</th>
                <th className="py-2.5 px-3">Notes</th>
                <th className="py-2.5 px-3">Date</th>
                {canManage && <th className="py-2.5 px-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {inflowsLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading fund inflows...
                  </td>
                </tr>
              ) : filteredInflows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No fund inflows recorded yet.
                  </td>
                </tr>
              ) : (
                filteredInflows.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {i.sourceTitle}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          i.category === "SPONSOR"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : i.category === "DEPT_FUND"
                            ? "bg-blue-50 text-[#2563EB] border border-blue-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {i.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                      {i.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {i.receivedBy?.name || "Fest Authority"}
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                      {i.notes || "—"}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {i.createdAt ? new Date(i.createdAt).toLocaleDateString() : "—"}
                    </td>
                    {canManage && (
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          disabled={deleteInflowMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Are you sure you want to delete fund inflow "${i.sourceTitle}" (${i.amount.toLocaleString()} BDT)? This financial action cannot be undone.`
                              )
                            ) {
                              deleteInflowMutation.mutate(i.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: ADD FUND INFLOW ──────────────────────────────────────── */}
      {isInflowModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#059669] flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  Record External Fund Inflow
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInflowModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInflowSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Source / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Khulna Tech Sponsorship or Dept Subvention"
                  value={inflowForm.sourceTitle}
                  onChange={(e) =>
                    setInflowForm((prev) => ({ ...prev, sourceTitle: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={inflowForm.category}
                    onChange={(e) =>
                      setInflowForm((prev) => ({
                        ...prev,
                        category: e.target.value as InflowCategory,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="SPONSOR">SPONSOR</option>
                    <option value="DEPT_FUND">DEPT_FUND</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Amount (BDT) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="e.g. 25000"
                    value={inflowForm.amount}
                    onChange={(e) =>
                      setInflowForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Memo / Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Cheque number, sponsoring MoU notes, etc."
                  value={inflowForm.notes}
                  onChange={(e) =>
                    setInflowForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsInflowModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInflowMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#059669] hover:bg-emerald-700 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {createInflowMutation.isPending ? "Recording..." : "Confirm Cash In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
