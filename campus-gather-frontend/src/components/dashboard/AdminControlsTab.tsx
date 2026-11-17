"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  Search,
  CheckCircle2,
  Shield,
  Plus,
  Edit2,
  X,
  CreditCard,
  Building,
  Check,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { usersApi, sectionsApi, analyticsApi, getApiErrorMessage } from "@/lib/api";
import type { User, Role, FestFeeStatus } from "@/types/fest";
import { TshirtMatrixCard } from "./TshirtMatrixCard";

export function AdminControlsTab({ currentUser }: { currentUser: User }) {
  const queryClient = useQueryClient();

  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const isConvenorOrAdmin =
    currentUser.role === "SUPER_ADMIN" || currentUser.role === "CONVENOR";

  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [feeStatusFilter, setFeeStatusFilter] = useState<string>("ALL");

  // Whitelist modal state
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false);
  const [whitelistData, setWhitelistData] = useState({
    studentId: "",
    fullName: "",
  });

  // Semester fee editing state
  const [editingSemester, setEditingSemester] = useState<number | null>(null);
  const [semesterFeeInput, setSemesterFeeInput] = useState<string>("");

  // Admin Safety Valves states
  const [resetConfirmUser, setResetConfirmUser] = useState<User | null>(null);
  const [revertFeeConfirmUser, setRevertFeeConfirmUser] = useState<User | null>(null);

  // Queries
  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ["users", "admin-controls"],
    queryFn: () => usersApi.getAll({ limit: 2000 }),
  });

  const { data: sections } = useQuery({
    queryKey: ["sections"],
    queryFn: () => sectionsApi.getAll(),
  });

  const { data: analytics } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => analyticsApi.getSummary(),
  });

  const users = usersResponse?.data || [];

  const studentUsers = users;

  // Sorted sections for dropdown: Sem 8 down to Sem 1
  const sortedSections = [...(sections || [])].sort((a, b) => {
    if (b.semester !== a.semester) return b.semester - a.semester;
    return a.sectionName.localeCompare(b.sectionName);
  });

  // Filtered users
  const filteredUsers = studentUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.studentId && u.studentId.includes(searchTerm)) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSection =
      sectionFilter === "ALL" || u.sectionId?.toString() === sectionFilter;

    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;

    const matchesFee =
      feeStatusFilter === "ALL" || u.festFeeStatus === feeStatusFilter;

    return matchesSearch && matchesSection && matchesRole && matchesFee;
  });

  // Mutations
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: Role }) =>
      usersApi.updateRole(userId, role),
    onSuccess: (updated) => {
      toast.success(`Role updated for ${updated.name}: ${updated.role}`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to update user role"));
    },
  });

  const updateFeeStatusMutation = useMutation({
    mutationFn: ({ userId, festFeeStatus }: { userId: number; festFeeStatus: FestFeeStatus }) =>
      usersApi.updateFeeStatus(userId, { festFeeStatus }),
    onSuccess: (updated) => {
      toast.success(
        `Updated fee status for ${updated.name}: ${
          updated.festFeeStatus === "PAID_TO_CR" ? "Paid" : "Unpaid"
        }`
      );
      setRevertFeeConfirmUser(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to update fee status"));
    },
  });

  const resetAccountMutation = useMutation({
    mutationFn: (userId: number) => usersApi.resetAccount(userId),
    onSuccess: (res) => {
      toast.success(
        res.message || "Student account reset successfully. Student ID is now available for registration."
      );
      setResetConfirmUser(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to reset student account"));
    },
  });



  const whitelistStudentMutation = useMutation({
    mutationFn: (payload: { studentId: string; fullName: string }) =>
      usersApi.whitelistStudent(payload),
    onSuccess: (student) => {
      toast.success(`Whitelisted student ${student.fullName} (${student.studentId})`);
      setIsWhitelistModalOpen(false);
      setWhitelistData({ studentId: "", fullName: "" });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to whitelist student"));
    },
  });

  const updateSemesterFeeMutation = useMutation({
    mutationFn: (payload: { semester: number; festFee: number }) =>
      sectionsApi.updateSemesterFee(payload),
    onSuccess: (data) => {
      toast.success(`Updated Semester ${data.semester} fee to ${data.festFee} BDT`);
      setEditingSemester(null);
      setSemesterFeeInput("");
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      queryClient.invalidateQueries({ queryKey: ["section"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to update semester fee"));
    },
  });

  const handleSaveSemesterFee = (sem: number) => {
    const feeNum = Number(semesterFeeInput);
    if (isNaN(feeNum) || feeNum < 0) {
      toast.error("Please enter a valid fest fee (0 or positive BDT)");
      return;
    }
    updateSemesterFeeMutation.mutate({ semester: sem, festFee: feeNum });
  };

  const handleWhitelistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = whitelistData.studentId.trim();
    const cleanName = whitelistData.fullName.trim();

    if (!cleanId || cleanId.length !== 11 || !/^\d+$/.test(cleanId)) {
      toast.error("Please enter a valid 11-digit Student ID");
      return;
    }
    if (!cleanName) {
      toast.error("Please enter the student's full name");
      return;
    }

    whitelistStudentMutation.mutate({
      studentId: cleanId,
      fullName: cleanName,
    });
  };

  // Semesters 1 to 8 configuration helper
  const semesterNumbers = [8, 7, 6, 5, 4, 3, 2, 1];

  return (
    <div className="space-y-6">
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Students, Sections & Semester Fees
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure semester fees, audit student registrations, and assign CR roles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isConvenorOrAdmin && (
            <button
              type="button"
              onClick={() => setIsWhitelistModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              + Whitelist Student
            </button>
          )}
        </div>
      </div>

      {/* ─── 1. SEMESTER FEE CONFIGURATION CARD (CONVENOR & SUPER_ADMIN) ─── */}
      {isConvenorOrAdmin && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#2563EB]" />
              <h3 className="font-bold text-slate-900 text-sm">
                Semester Fee Configuration (Semesters 1 to 8)
              </h3>
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Updates all batch sections in the respective semester simultaneously
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {semesterNumbers.map((sem) => {
              const semSections = (sections || []).filter((s) => s.semester === sem);
              const currentFee = semSections.length > 0 ? semSections[0].festFee : 0;
              const isEditing = editingSemester === sem;

              return (
                <div
                  key={sem}
                  className="p-3.5 rounded-xl border border-[#E2E8F0] bg-slate-50 flex flex-col justify-between space-y-2 hover:border-[#2563EB]/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Sem {sem}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {semSections.length} Sec
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-1.5">
                      <input
                        type="number"
                        min={0}
                        value={semesterFeeInput}
                        onChange={(e) => setSemesterFeeInput(e.target.value)}
                        placeholder="BDT"
                        className="w-full py-1 px-2 text-xs font-mono bg-white border border-[#2563EB] rounded-lg focus:outline-none"
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleSaveSemesterFee(sem)}
                          disabled={updateSemesterFeeMutation.isPending}
                          className="flex-1 py-1 text-[10px] font-bold text-white bg-[#059669] hover:bg-emerald-700 rounded flex items-center justify-center cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSemester(null)}
                          className="flex-1 py-1 text-[10px] font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-extrabold text-slate-900 font-mono">
                        {currentFee > 0 ? (
                          `${currentFee} BDT`
                        ) : (
                          <span className="text-[#D97706] text-xs font-bold">0 BDT (TBD)</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSemester(sem);
                          setSemesterFeeInput(currentFee.toString());
                        }}
                        className="mt-1.5 w-full py-1 text-[10px] font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Edit2 className="w-2.5 h-2.5" /> Set Fee
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── LIVE T-SHIRT PRODUCTION & INVENTORY MATRIX CARD ─────────────── */}
      <TshirtMatrixCard
        analytics={analytics}
        title="T-Shirt Order & Inventory Matrix"
        subtitle="Registered demand vs confirmed PAID_TO_CR factory print order"
      />

      {/* ─── 2. SECTION-WISE STUDENT DIRECTORY & MULTI-FILTER BAR ────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student, roll, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] font-mono text-slate-900"
            />
          </div>

          {/* Section Filter (All Sections, 8A..1A) */}
          <div>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl focus:outline-none text-slate-700 font-medium"
            >
              <option value="ALL">All Sections ({sections?.length || 38} Batches)</option>
              {sortedSections.map((s) => (
                <option key={s.id} value={s.id.toString()}>
                  Section {s.code} (Sem {s.semester})
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl focus:outline-none text-slate-700 font-medium"
            >
              <option value="ALL">All Roles</option>
              <option value="STUDENT">STUDENT</option>
              <option value="CR">CR (Class Rep)</option>
              <option value="CONVENOR">CONVENOR</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
          </div>

          {/* Fee Status Filter */}
          <div>
            <select
              value={feeStatusFilter}
              onChange={(e) => setFeeStatusFilter(e.target.value)}
              className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl focus:outline-none text-slate-700 font-medium"
            >
              <option value="ALL">All Fee Status</option>
              <option value="PAID_TO_CR">PAID_TO_CR</option>
              <option value="UNPAID">UNPAID</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── STUDENTS TABLE ──────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs min-w-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-slate-900">
              Student Directory ({filteredUsers.length})
            </h3>
          </div>
        </div>

        {usersLoading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">
            Loading student records...
          </div>
        ) : filteredUsers.length === 0 ? (
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
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Fee Status</th>
                  <th className="py-3 px-4">T-Shirt</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.map((u) => {
                  const isPaid = u.festFeeStatus === "PAID_TO_CR";
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {u.studentId || "—"}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div>{u.name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{u.email}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {u.section?.code ? `${u.section.code} (Sem ${u.section.semester})` : "—"}
                      </td>

                      {/* Role Column: Controlled hierarchy promotion */}
                      <td className="py-3 px-4">
                        {(() => {
                          const isSelf = currentUser.id === u.id;
                          const staticBadge = (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                u.role === "CR"
                                  ? "bg-amber-100 text-[#D97706] border border-amber-200"
                                  : u.role === "CONVENOR" || u.role === "SUPER_ADMIN"
                                  ? "bg-indigo-100 text-[#2563EB] border border-indigo-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {u.role}
                            </span>
                          );

                          if (isSelf) {
                            return staticBadge;
                          }

                          if (isSuperAdmin) {
                            if (u.role === "SUPER_ADMIN") return staticBadge;
                            return (
                              <select
                                value={u.role}
                                disabled={updateRoleMutation.isPending}
                                onChange={(e) =>
                                  updateRoleMutation.mutate({
                                    userId: u.id,
                                    role: e.target.value as Role,
                                  })
                                }
                                className="py-1 px-2 text-[11px] font-mono font-bold uppercase bg-slate-50 border border-[#E2E8F0] rounded-lg focus:outline-none text-slate-800 cursor-pointer"
                              >
                                <option value="STUDENT">STUDENT</option>
                                <option value="CR">CR</option>
                                <option value="CONVENOR">CONVENOR</option>
                              </select>
                            );
                          }

                          if (currentUser.role === "CONVENOR") {
                            if (u.role === "STUDENT" || u.role === "CR") {
                              return (
                                <select
                                  value={u.role}
                                  disabled={updateRoleMutation.isPending}
                                  onChange={(e) =>
                                    updateRoleMutation.mutate({
                                      userId: u.id,
                                      role: e.target.value as Role,
                                    })
                                  }
                                  className="py-1 px-2 text-[11px] font-mono font-bold uppercase bg-slate-50 border border-[#E2E8F0] rounded-lg focus:outline-none text-slate-800 cursor-pointer"
                                >
                                  <option value="STUDENT">STUDENT</option>
                                  <option value="CR">CR</option>
                                </select>
                              );
                            }
                            return staticBadge;
                          }

                          return staticBadge;
                        })()}
                      </td>

                      {/* Fee Status Badge & Toggle */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              isPaid
                                ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                                : "bg-amber-50 text-[#D97706] border border-amber-200"
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {u.festFeeStatus}
                          </span>

                          {(isSuperAdmin || (currentUser.role === "CR" && u.sectionId === currentUser.sectionId)) && (
                            isPaid ? (
                              <button
                                type="button"
                                disabled={updateFeeStatusMutation.isPending}
                                onClick={() => setRevertFeeConfirmUser(u)}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition-colors"
                                title="Revert fee status back to UNPAID"
                              >
                                Revert to Unpaid
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={updateFeeStatusMutation.isPending}
                                onClick={() =>
                                  updateFeeStatusMutation.mutate({
                                    userId: u.id,
                                    festFeeStatus: "PAID_TO_CR",
                                  })
                                }
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer transition-colors"
                              >
                                Mark Paid
                              </button>
                            )
                          )}
                        </div>
                      </td>

                      {/* T-Shirt */}
                      <td className="py-3 px-4 font-mono font-semibold">
                        {u.tshirtSize}
                      </td>

                      {/* Actions Column: Reset Student Account for SUPER_ADMIN */}
                      <td className="py-3 px-4 text-right">
                        {isSuperAdmin && u.role !== "SUPER_ADMIN" ? (
                          <button
                            type="button"
                            disabled={resetAccountMutation.isPending}
                            onClick={() => setResetConfirmUser(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                            title="Delete student account and release Student ID"
                          >
                            <Trash2 className="w-3 h-3" />
                            Reset Account
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL: WHITELIST STUDENT (CONVENOR & SUPER_ADMIN) ─────────── */}
      {isConvenorOrAdmin && isWhitelistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  + Whitelist New CSE Student
                </h3>
                <p className="text-xs text-slate-500">
                  Allow an eligible student to register for CSE Fest 2026
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWhitelistModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWhitelistSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  11-Digit Student ID
                </label>
                <input
                  type="text"
                  required
                  maxLength={11}
                  value={whitelistData.studentId}
                  onChange={(e) =>
                    setWhitelistData({
                      ...whitelistData,
                      studentId: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  placeholder="e.g. 11210320999"
                  className="w-full py-2 px-3 text-xs font-mono bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Official Full Name
                </label>
                <input
                  type="text"
                  required
                  value={whitelistData.fullName}
                  onChange={(e) =>
                    setWhitelistData({ ...whitelistData, fullName: e.target.value })
                  }
                  placeholder="e.g. Tanvir Ahmed"
                  className="w-full py-2 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWhitelistModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={whitelistStudentMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {whitelistStudentMutation.isPending ? "Adding..." : "Confirm Whitelist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONFIRM REVERT FEE STATUS (SUPER_ADMIN & SECTION CR) ── */}
      {revertFeeConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-slate-900 text-base">
                  Revert Fee Status
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRevertFeeConfirmUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to revert fee status for{" "}
                <strong className="text-slate-900">{revertFeeConfirmUser.name}</strong>{" "}
                ({revertFeeConfirmUser.studentId || revertFeeConfirmUser.email}) from{" "}
                <span className="font-semibold text-emerald-600">PAID_TO_CR</span> back to{" "}
                <span className="font-semibold text-amber-600">UNPAID</span>?
              </p>
              <p className="text-[11px] text-slate-500">
                This will reset their paid amount to 0 BDT and unmark kit delivery.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-[#E2E8F0] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevertFeeConfirmUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateFeeStatusMutation.isPending}
                onClick={() =>
                  updateFeeStatusMutation.mutate({
                    userId: revertFeeConfirmUser.id,
                    festFeeStatus: "UNPAID",
                  })
                }
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {updateFeeStatusMutation.isPending ? "Reverting..." : "Confirm Revert to Unpaid"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: RESET STUDENT ACCOUNT (SUPER_ADMIN ONLY) ───────────── */}
      {resetConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-slate-900 text-base">
                  Reset Student Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResetConfirmUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Resetting <strong className="text-slate-900">{resetConfirmUser.name}</strong> (
                {resetConfirmUser.studentId || resetConfirmUser.email}) will delete their account and allow this Student ID to register again. Continue?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-1">
                <div className="font-semibold">This safety valve will:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Delete the user record and linked fest registrations</li>
                  <li>Restore seatsLeft on each contest the student registered for</li>
                  <li>Reset AllowedStudent.isClaimed = false so the roll can register freshly</li>
                </ul>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-[#E2E8F0] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetConfirmUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetAccountMutation.isPending}
                onClick={() => resetAccountMutation.mutate(resetConfirmUser.id)}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {resetAccountMutation.isPending ? "Resetting..." : "Confirm & Reset Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
