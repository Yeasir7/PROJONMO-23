"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Banknote,
  CheckCircle2,
  XCircle,
  Search,
  Send,
  Clock,
  CheckCheck,
  X,
  Users,
  Wallet,
  AlertCircle,
  Shield,
} from "lucide-react";
import { usersApi, cashHandoversApi, sectionsApi, getApiErrorMessage } from "@/lib/api";
import type { User, CashHandover, FestFeeStatus } from "@/types/fest";

export function CRCollectionTab({ currentUser }: { currentUser: User }) {
  const queryClient = useQueryClient();

  const isCR = currentUser.role === "CR";
  const isStudent = currentUser.role === "STUDENT";

  const [searchTerm, setSearchTerm] = useState("");
  const [feeStatusFilter, setFeeStatusFilter] = useState<string>("ALL");
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  // Form state for cash handover
  const [handoverData, setHandoverData] = useState({
    receivedById: "",
    amount: "",
    notes: "",
  });

  // Fetch Section details to get live festFee
  const { data: sectionData } = useQuery({
    queryKey: ["section", currentUser.sectionId],
    queryFn: () => sectionsApi.getById(currentUser.sectionId!),
    enabled: !!currentUser.sectionId,
  });

  const festFee = sectionData?.festFee ?? currentUser.section?.festFee ?? 0;
  const isFeeConfigured = festFee > 0;

  // Queries
  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ["users", "section-view"],
    queryFn: () => usersApi.getAll({ limit: 2000 }),
  });

  const { data: handoversResponse, isLoading: handoversLoading } = useQuery({
    queryKey: ["cashHandovers"],
    queryFn: () => cashHandoversApi.getAll({ limit: 2000 }),
  });

  const allUsers = usersResponse?.data || [];
  const handovers = handoversResponse?.data || [];

  // Filter: ONLY students in user's own section
  const sectionStudents = allUsers.filter(
    (s) => (currentUser.sectionId ? s.sectionId === currentUser.sectionId : true)
  );

  const sectionCR = sectionStudents.find((s) => s.role === "CR");

  const filteredStudents = sectionStudents.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.studentId && student.studentId.includes(searchTerm)) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      feeStatusFilter === "ALL" || student.festFeeStatus === feeStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculations for KPIs
  const totalStudents = sectionStudents.length;
  const paidStudents = sectionStudents.filter(
    (s) => s.festFeeStatus === "PAID_TO_CR"
  ).length;
  const totalCollected = sectionStudents.reduce(
    (acc, s) => acc + (s.paidAmount || 0),
    0
  );

  const sectionHandovers = handovers.filter(
    (h) => currentUser.sectionId ? h.sectionId === currentUser.sectionId : true
  );

  const totalHandedOver = sectionHandovers.reduce(
    (acc, h) => acc + (h.amount || 0),
    0
  );
  const remainingInHand = Math.max(0, totalCollected - totalHandedOver);

  // Potential receivers: SUPER_ADMIN, CONVENOR
  const potentialReceivers = allUsers.filter(
    (u) =>
      u.role === "SUPER_ADMIN" ||
      u.role === "CONVENOR"
  );

  // Toggle Fee Status Mutation
  const toggleFeeMutation = useMutation({
    mutationFn: ({
      userId,
      festFeeStatus,
    }: {
      userId: number;
      festFeeStatus: FestFeeStatus;
    }) => usersApi.updateFeeStatus(userId, { festFeeStatus }),
    onSuccess: (updatedUser) => {
      toast.success(
        `Updated fee status for ${updatedUser.name}: ${
          updatedUser.festFeeStatus === "PAID_TO_CR" ? "Paid" : "Unpaid"
        }`
      );
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to update fee status"));
    },
  });


  // Submit Cash Handover Mutation
  const submitHandoverMutation = useMutation({
    mutationFn: (data: { receivedById: number; amount: number; notes?: string }) =>
      cashHandoversApi.create(data),
    onSuccess: () => {
      toast.success("Cash handover submitted to Convenor for audit verification!");
      setIsHandoverModalOpen(false);
      setHandoverData({ receivedById: "", amount: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["cashHandovers"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to submit cash handover"));
    },
  });

  const handleToggleFee = (student: User) => {
    if (!isFeeConfigured) {
      toast.error("Fest fee has not been set by the Convenor yet. Collection is locked.");
      return;
    }
    const newStatus: FestFeeStatus =
      student.festFeeStatus === "PAID_TO_CR" ? "UNPAID" : "PAID_TO_CR";

    if (newStatus === "UNPAID") {
      const confirmed = window.confirm(
        `Are you sure you want to revert fee status for ${student.name} (${student.studentId || student.email}) back to UNPAID? This will reset their paid amount to 0 BDT.`
      );
      if (!confirmed) return;
    }

    toggleFeeMutation.mutate({
      userId: student.id,
      festFeeStatus: newStatus,
    });
  };

  const handleHandoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(handoverData.amount);
    const receiverNum = Number(handoverData.receivedById);

    if (!receiverNum) {
      toast.error("Please choose a receiving authority");
      return;
    }
    if (!amountNum || amountNum <= 0) {
      toast.error("Handover amount must be greater than 0");
      return;
    }
    if (amountNum > remainingInHand) {
      toast.error(
        `Handover amount (${amountNum} BDT) exceeds in-hand collected cash (${remainingInHand} BDT)`
      );
      return;
    }

    submitHandoverMutation.mutate({
      receivedById: receiverNum,
      amount: amountNum,
      notes: handoverData.notes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Section ({currentUser.section?.code || "Section"})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isCR
              ? "Track classmates' payments, monitor in-hand cash, and submit physical handovers to Convenor."
              : "Read-only view of your academic section's registration and fest fee status."}
          </p>
        </div>

        {isCR && (
          <button
            type="button"
            disabled={!isFeeConfigured || remainingInHand <= 0}
            onClick={() => setIsHandoverModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            + Hand Over Cash to Convenor
          </button>
        )}
      </div>

      {/* ─── READ-ONLY TRANSPARENCY BANNER (STUDENT ONLY) ───────────────── */}
      {!isCR && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-white border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5 shadow-sm">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">
                  Section Transparency View
                </h4>
                <span className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-semibold">
                  Read-Only
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Viewing classmates and fee collection progress for Section{" "}
                <span className="font-semibold text-slate-900">
                  {currentUser.section?.code || "Section"}
                </span>
                .
              </p>
            </div>
          </div>

          {sectionCR ? (
            <div className="flex items-center gap-3 bg-white/90 border border-slate-200/80 px-3.5 py-2.5 rounded-xl shrink-0 shadow-xs">
              <div className="h-8 w-8 rounded-full bg-amber-100 border border-amber-300 text-[#D97706] flex items-center justify-center font-bold text-xs">
                CR
              </div>
              <div className="text-xs">
                <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  Pay Fest Fee To Your CR
                </div>
                <div className="font-bold text-slate-900">{sectionCR.name}</div>
                <div className="text-slate-500 font-mono text-[11px]">
                  {sectionCR.studentId ? `ID: ${sectionCR.studentId}` : sectionCR.email}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic bg-white/80 border border-slate-200/80 px-3 py-2 rounded-xl">
              No Section CR designated yet. Pay directly to Convenor.
            </div>
          )}
        </div>
      )}

      {/* ─── INFORMATIONAL BANNER WHEN FEE IS ZERO (CR ONLY) ───────────── */}
      {isCR && !isFeeConfigured && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-[#D97706]">
          <AlertCircle className="w-5 h-5 shrink-0 text-[#D97706]" />
          <div>
            <span className="font-bold">Collection Locked:</span> Convenor has not set your semester&apos;s fest fee yet. Collection will unlock once the fee is set.
          </div>
        </div>
      )}

      {/* ─── TOP SUMMARY CARDS (EXACT 5 REQUIRED) ────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Section Students */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Section Students</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {totalStudents}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Section {currentUser.section?.code || "—"}</div>
        </div>

        {/* 2. Paid Count */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Paid Count</span>
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-bold text-[#059669] mt-2">
            {paidStudents} <span className="text-xs font-normal text-slate-400">/ {totalStudents}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalStudents ? Math.round((paidStudents / totalStudents) * 100) : 0}% cleared
          </div>
        </div>

        {/* 3. Semester Fee */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Semester Fee</span>
            <Banknote className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {isFeeConfigured ? `${festFee} BDT` : "Not Set Yet"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Sem {currentUser.section?.semester ?? "—"}</div>
        </div>

        {/* 4. Total Section Collection (BDT) */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Collection</span>
            <Wallet className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {totalCollected.toLocaleString()} <span className="text-xs font-normal text-slate-400">BDT</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Gross collected by CR</div>
        </div>

        {/* 5. Verified / Handed Over (BDT) */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Verified / Handed Over</span>
            <CheckCheck className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-bold text-[#059669] mt-2">
            {totalHandedOver.toLocaleString()} <span className="text-xs font-normal text-slate-400">BDT</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Submitted to Convenors</div>
        </div>
      </div>

      {/* ─── SEARCH & FILTER ─────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search classmates by name, roll, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] font-mono text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={feeStatusFilter}
              onChange={(e) => setFeeStatusFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl focus:outline-none text-slate-700 font-medium"
            >
              <option value="ALL">All Fee Status</option>
              <option value="PAID_TO_CR">PAID_TO_CR</option>
              <option value="UNPAID">UNPAID</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── SECTION STUDENTS TABLE ──────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs min-w-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-slate-900">
              Students in Section {currentUser.section?.code || "Section"} ({filteredStudents.length})
            </h3>
          </div>
          {isStudent && (
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Read-Only Student View
            </span>
          )}
        </div>

        {usersLoading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">
            Loading section roster...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono">
            No students found matching current filters.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">T-Shirt</th>
                  <th className="py-3 px-4">Fee Status</th>
                  <th className="py-3 px-4">Paid Amount</th>
                  {isCR && <th className="py-3 px-4 text-right">CR Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStudents.map((student) => {
                  const isPaid = student.festFeeStatus === "PAID_TO_CR";
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {student.studentId || "—"}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div>{student.name}</div>
                        {student.committeeMemberships && student.committeeMemberships.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {student.committeeMemberships.map((cm) => (
                              <span
                                key={cm.id}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                              >
                                {cm.designation === "LEAD" ? "Lead" : "Member"} • {cm.committee?.name || "Committee"}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            student.role === "CR"
                              ? "bg-amber-100 text-[#D97706] border border-amber-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {student.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        {student.tshirtSize}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isPaid
                              ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                              : "bg-amber-50 text-[#D97706] border border-amber-200"
                          }`}
                        >
                          {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {isPaid ? "PAID_TO_CR" : "UNPAID"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {student.paidAmount || 0} BDT
                      </td>
                      {isCR && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={!isFeeConfigured || toggleFeeMutation.isPending}
                              onClick={() => handleToggleFee(student)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                isPaid
                                  ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                                  : "bg-emerald-50 hover:bg-emerald-100 text-[#059669] border border-emerald-200"
                              }`}
                            >
                              {isPaid ? "Mark Unpaid" : "Mark as Paid"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── SECTION HANDOVER HISTORY TABLE ──────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs min-w-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-slate-900">
              Section Cash Handover History ({sectionHandovers.length})
            </h3>
          </div>
          {isCR ? (
            <div className="text-xs font-semibold text-slate-500">
              Remaining in Hand: <strong className="text-slate-900 font-mono">{remainingInHand.toLocaleString()} BDT</strong>
            </div>
          ) : (
            <div className="text-xs font-semibold text-slate-500">
              Total Handed Over: <strong className="text-[#059669] font-mono">{totalHandedOver.toLocaleString()} BDT</strong>
            </div>
          )}
        </div>

          {sectionHandovers.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 font-mono">
              No cash handovers recorded yet for Section {currentUser.section?.code || "—"}.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Submitted To</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sectionHandovers.map((h) => {
                    const isVerified = h.status === "VERIFIED";
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          #{h.id}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {h.amount.toLocaleString()} BDT
                        </td>
                        <td className="py-3 px-4">
                          {h.receivedBy?.name || "Convenor"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              isVerified
                                ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                                : "bg-amber-50 text-[#D97706] border border-amber-200"
                            }`}
                          >
                            {isVerified ? <CheckCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {h.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {h.notes || "—"}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {new Date(h.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* ─── MODAL: HAND OVER CASH TO CONVENOR (CR ONLY) ────────────────── */}
      {isCR && isHandoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Hand Over Cash to Convenor
                </h3>
                <p className="text-xs text-slate-500">
                  Transfer physically collected notes to fest treasury
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHandoverModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleHandoverSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs space-y-1">
                <div className="text-slate-500">Total Collected by You: <strong className="text-slate-900">{totalCollected.toLocaleString()} BDT</strong></div>
                <div className="text-slate-500">Already Handed Over: <strong className="text-slate-900">{totalHandedOver.toLocaleString()} BDT</strong></div>
                <div className="text-[#2563EB] font-bold">Max Allowed to Hand Over: {remainingInHand.toLocaleString()} BDT</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Receiving Authority (Convenor / Super Admin)
                </label>
                <select
                  required
                  value={handoverData.receivedById}
                  onChange={(e) =>
                    setHandoverData({ ...handoverData, receivedById: e.target.value })
                  }
                  className="w-full py-2 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-800"
                >
                  <option value="">-- Choose Convenor / Admin --</option>
                  {potentialReceivers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) — {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Handover Cash Amount (BDT)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={remainingInHand}
                  value={handoverData.amount}
                  onChange={(e) =>
                    setHandoverData({ ...handoverData, amount: e.target.value })
                  }
                  placeholder={`Max: ${remainingInHand}`}
                  className="w-full py-2 px-3 text-xs font-mono bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Handover Notes / Batch Envelope Details
                </label>
                <textarea
                  rows={2}
                  value={handoverData.notes}
                  onChange={(e) =>
                    setHandoverData({ ...handoverData, notes: e.target.value })
                  }
                  placeholder="e.g. Enclosed 15 students fee envelope for Batch 8A"
                  className="w-full py-2 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsHandoverModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitHandoverMutation.isPending || remainingInHand <= 0}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submitHandoverMutation.isPending ? "Submitting..." : "Confirm Handover"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
