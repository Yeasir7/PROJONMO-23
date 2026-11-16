"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Edit2,
  Plus,
  Trash2,
  X,
  UserPlus,
  Shield,
  Layers,
  Search,
  ArrowLeftRight,
} from "lucide-react";
import {
  committeesApi,
  usersApi,
  getApiErrorMessage,
} from "@/lib/api";
import type { User, CommitteeBudgetItem } from "@/types/fest";

export function CommitteesTab({ currentUser }: { currentUser: User }) {
  const queryClient = useQueryClient();

  const canManage =
    currentUser.role === "SUPER_ADMIN" || currentUser.role === "CONVENOR";

  // State for modals
  const [editBudgetCommittee, setEditBudgetCommittee] =
    useState<CommitteeBudgetItem | null>(null);
  const [newBudget, setNewBudget] = useState("");

  const [membersCommitteeId, setMembersCommitteeId] = useState<number | null>(
    null
  );
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [selectedMemberUserId, setSelectedMemberUserId] = useState("");
  const [selectedMemberDesignation, setSelectedMemberDesignation] = useState<
    "LEAD" | "MEMBER"
  >("MEMBER");

  // Queries
  const { data: committees, isLoading: committeesLoading } = useQuery({
    queryKey: ["committees"],
    queryFn: () => committeesApi.getAll(),
  });

  const { data: singleCommittee, isLoading: singleCommitteeLoading } = useQuery({
    queryKey: ["committee", membersCommitteeId],
    queryFn: () => committeesApi.getById(membersCommitteeId!),
    enabled: membersCommitteeId !== null,
  });

  const { data: usersResponse } = useQuery({
    queryKey: ["users", "all-for-members"],
    queryFn: () => usersApi.getAll({ limit: 2000 }),
    enabled: membersCommitteeId !== null && canManage,
  });

  const allUsers = usersResponse?.data || [];

  const filteredCandidates = allUsers.filter((u) => {
    if (!memberSearchTerm.trim()) return true;
    const q = memberSearchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.studentId && u.studentId.toLowerCase().includes(q)) ||
      (u.section?.code && u.section.code.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q)
    );
  });

  // Mutations
  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, budget }: { id: number; budget: number }) =>
      committeesApi.update(id, { allocatedBudget: budget }),
    onSuccess: () => {
      toast.success("Committee allocated budget updated successfully!");
      setEditBudgetCommittee(null);
      queryClient.invalidateQueries({ queryKey: ["committees"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to update budget"));
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: ({
      committeeId,
      userId,
      designation,
    }: {
      committeeId: number;
      userId: number;
      designation?: "LEAD" | "MEMBER";
    }) => committeesApi.addMember(committeeId, { userId, designation }),
    onSuccess: () => {
      toast.success("Member added to committee!");
      setSelectedMemberUserId("");
      queryClient.invalidateQueries({ queryKey: ["committee", membersCommitteeId] });
      queryClient.invalidateQueries({ queryKey: ["committees"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to add member to committee"));
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({
      committeeId,
      userId,
    }: {
      committeeId: number;
      userId: number;
    }) => committeesApi.removeMember(committeeId, userId),
    onSuccess: () => {
      toast.success("Member removed from committee");
      queryClient.invalidateQueries({ queryKey: ["committee", membersCommitteeId] });
      queryClient.invalidateQueries({ queryKey: ["committees"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to remove member"));
    },
  });

  const toggleDesignationMutation = useMutation({
    mutationFn: ({
      committeeId,
      userId,
      nextDesignation,
    }: {
      committeeId: number;
      userId: number;
      nextDesignation: "LEAD" | "MEMBER";
    }) =>
      committeesApi.updateMember(committeeId, userId, {
        designation: nextDesignation,
      }),
    onSuccess: (updated) => {
      toast.success(`Designation updated to ${updated.designation}`);
      queryClient.invalidateQueries({ queryKey: ["committee", membersCommitteeId] });
      queryClient.invalidateQueries({ queryKey: ["committees"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to update member designation"));
    },
  });

  const handleUpdateBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBudgetCommittee) return;
    const b = Number(newBudget);
    if (isNaN(b) || b < 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }
    updateBudgetMutation.mutate({
      id: editBudgetCommittee.id,
      budget: b,
    });
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!membersCommitteeId || !selectedMemberUserId) return;
    addMemberMutation.mutate({
      committeeId: membersCommitteeId,
      userId: Number(selectedMemberUserId),
      designation: selectedMemberDesignation,
    });
  };

  return (
    <div className="space-y-6">
      {/* ─── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#2563EB]">
              <Building2 className="w-4 h-4" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              13 Committees & Teams
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official executive working committees: Budget allocations, member rosters, and team leads.
          </p>
        </div>
      </div>

      {/* ─── 13 COMMITTEES GRID ─────────────────────────────────────────── */}
      {committeesLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-mono">
          Loading 13 committees...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {committees?.map((comm) => {
            const percent =
              comm.allocatedBudget > 0
                ? Math.min(
                    100,
                    Math.round((comm.totalSpent / comm.allocatedBudget) * 100)
                  )
                : 0;

            return (
              <div
                key={comm.id}
                className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs min-w-0 overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                    <span className="font-semibold text-slate-500">
                      TEAM #{comm.id}
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {comm.allocatedBudget.toLocaleString()} BDT
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 tracking-tight">
                    {comm.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {comm.description || "Official CSE Fest Committee Team"}
                  </p>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>Spent: {comm.totalSpent.toLocaleString()} BDT</span>
                      <span className="font-mono">{percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          percent > 85 ? "bg-rose-500" : "bg-[#2563EB]"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>Remaining:</span>
                      <strong
                        className={`font-mono ${
                          comm.remainingBudget < 0
                            ? "text-rose-600 font-bold"
                            : "text-[#059669] font-bold"
                        }`}
                      >
                        {comm.remainingBudget.toLocaleString()} BDT
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setMembersCommitteeId(comm.id)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-[#2563EB] hover:bg-slate-50 border border-[#E2E8F0] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Members ({comm._count?.members || 0})
                  </button>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditBudgetCommittee(comm);
                        setNewBudget(comm.allocatedBudget.toString());
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-[#2563EB] hover:bg-blue-50 border border-blue-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Budget
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL 1: EDIT BUDGET MODAL ─────────────────────────────────── */}
      {editBudgetCommittee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl shadow-xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Edit Committee Budget
                  </h3>
                  <div className="text-xs text-slate-500 font-medium">
                    {editBudgetCommittee.name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditBudgetCommittee(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateBudgetSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Allocated Budget (BDT) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Current spent: {editBudgetCommittee.totalSpent.toLocaleString()} BDT
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setEditBudgetCommittee(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateBudgetMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {updateBudgetMutation.isPending ? "Saving..." : "Save Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: MANAGE MEMBERS MODAL ──────────────────────────────── */}
      {membersCommitteeId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="max-w-xl w-full bg-white border border-[#E2E8F0] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {singleCommittee?.name || "Committee Members"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assigned Team Leads and Working Members
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMembersCommitteeId(null);
                  setMemberSearchTerm("");
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs">
              {/* Add member form */}
              {canManage && (
                <form
                  onSubmit={handleAddMemberSubmit}
                  className="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-3"
                >
                  <div className="text-xs font-bold text-[#2563EB] flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4" /> Add Member to Committee
                  </div>

                  {/* Search Candidate Input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Search by Name or Student ID
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by Name or Student ID"
                        value={memberSearchTerm}
                        onChange={(e) => setMemberSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <select
                        required
                        value={selectedMemberUserId}
                        onChange={(e) => setSelectedMemberUserId(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none"
                      >
                        <option value="">
                          -- Select member ({filteredCandidates.length} found) --
                        </option>
                        {filteredCandidates.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} — {u.studentId || "—"} ({u.section?.code || "—"})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        value={selectedMemberDesignation}
                        onChange={(e) =>
                          setSelectedMemberDesignation(
                            e.target.value as "LEAD" | "MEMBER"
                          )
                        }
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none font-mono"
                      >
                        <option value="MEMBER">MEMBER</option>
                        <option value="LEAD">LEAD</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={addMemberMutation.isPending}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {addMemberMutation.isPending ? "Adding..." : "Add to Committee"}
                    </button>
                  </div>
                </form>
              )}

              {/* Members List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Assigned Team Members ({singleCommittee?.members?.length || 0})
                </div>

                {singleCommitteeLoading ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-mono">
                    Loading members...
                  </div>
                ) : !singleCommittee?.members || singleCommittee.members.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                    No members assigned yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl overflow-hidden">
                    {singleCommittee.members.map((member) => (
                      <div
                        key={member.id}
                        className="p-3 bg-white flex items-center justify-between gap-2 hover:bg-slate-50"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900">
                              {member.user?.name}
                            </span>
                            {canManage ? (
                              <button
                                type="button"
                                disabled={toggleDesignationMutation.isPending}
                                onClick={() => {
                                  const nextDesignation =
                                    member.designation === "LEAD" ? "MEMBER" : "LEAD";
                                  toggleDesignationMutation.mutate({
                                    committeeId: membersCommitteeId!,
                                    userId: member.userId,
                                    nextDesignation,
                                  });
                                }}
                                title="Click to toggle designation between LEAD and MEMBER"
                                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                  member.designation === "LEAD"
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                                }`}
                              >
                                <ArrowLeftRight className="w-2.5 h-2.5" />
                                {member.designation}
                              </button>
                            ) : (
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                  member.designation === "LEAD"
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {member.designation}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {member.user?.email} • Roll: {member.user?.studentId || "—"}
                          </div>
                        </div>

                        {canManage && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove ${member.user?.name} from ${singleCommittee.name}?`)) {
                                removeMemberMutation.mutate({
                                  committeeId: membersCommitteeId,
                                  userId: member.userId,
                                });
                              }
                            }}
                            disabled={removeMemberMutation.isPending}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
