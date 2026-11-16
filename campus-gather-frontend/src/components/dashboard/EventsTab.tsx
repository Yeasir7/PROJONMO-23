"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Trophy,
  Plus,
  Edit2,
  CheckCircle2,
  Clock,
  X,
  Search,
  Users,
  CreditCard,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  segmentRegistrationsApi,
  segmentsApi,
  getApiErrorMessage,
} from "@/lib/api";
import type {
  User,
  Segment,
  ParticipationType,
} from "@/types/fest";

export function EventsTab({ currentUser }: { currentUser: User }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const isOrganizer =
    currentUser.role === "SUPER_ADMIN" || currentUser.role === "CONVENOR";

  // Create Segment modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createData, setCreateData] = useState({
    title: "",
    category: "Programming",
    participationType: "SOLO" as ParticipationType,
    registrationFee: "0",
    maxCapacity: "50",
    description: "",
  });

  // Edit Segment modal
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [editData, setEditData] = useState({
    title: "",
    category: "Programming",
    participationType: "SOLO" as ParticipationType,
    registrationFee: "0",
    maxCapacity: "50",
    description: "",
  });

  // Queries
  const { data: segments, isLoading: segmentsLoading } = useQuery({
    queryKey: ["segments"],
    queryFn: () => segmentsApi.getAll(),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: {
      title: string;
      category: string;
      participationType: ParticipationType;
      registrationFee: number;
      maxCapacity: number;
      description?: string;
    }) => segmentsApi.create(data),
    onSuccess: () => {
      toast.success("Event created successfully!");
      setIsCreateModalOpen(false);
      setCreateData({
        title: "",
        category: "Programming",
        participationType: "SOLO",
        registrationFee: "0",
        maxCapacity: "50",
        description: "",
      });
      queryClient.invalidateQueries({ queryKey: ["segments"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to create event"));
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        title: string;
        category: string;
        participationType: ParticipationType;
        registrationFee: number;
        maxCapacity: number;
        description?: string;
      };
    }) => segmentsApi.update(id, data),
    onSuccess: () => {
      toast.success("Event updated successfully!");
      setEditingSegment(null);
      queryClient.invalidateQueries({ queryKey: ["segments"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to update event"));
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createData.title.trim()) {
      toast.error("Event title is required");
      return;
    }
    createMutation.mutate({
      title: createData.title.trim(),
      category: createData.category.trim(),
      participationType: createData.participationType,
      registrationFee: Number(createData.registrationFee) || 0,
      maxCapacity: Number(createData.maxCapacity) || 50,
      description: createData.description.trim() || undefined,
    });
  };

  const openEditModal = (seg: Segment, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSegment(seg);
    setEditData({
      title: seg.title,
      category: seg.category,
      participationType: seg.participationType || "SOLO",
      registrationFee: seg.registrationFee.toString(),
      maxCapacity: seg.maxCapacity.toString(),
      description: seg.description || "",
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSegment) return;
    if (!editData.title.trim()) {
      toast.error("Event title is required");
      return;
    }
    updateMutation.mutate({
      id: editingSegment.id,
      data: {
        title: editData.title.trim(),
        category: editData.category.trim(),
        participationType: editData.participationType,
        registrationFee: Number(editData.registrationFee) || 0,
        maxCapacity: Number(editData.maxCapacity) || 50,
        description: editData.description.trim() || undefined,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Events & Contests Roster
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Intra-department programming battles, e-sports arenas, project showcase, and cultural segments.
          </p>
        </div>

        {isOrganizer && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            + Create Contest / Event
          </button>
        )}
      </div>

      {/* ─── EVENTS GRID ─────────────────────────────────────────────────── */}
      {segmentsLoading ? (
        <div className="p-12 text-center bg-white border border-[#E2E8F0] rounded-2xl">
          <div className="inline-block w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mb-2" />
          <div className="text-xs text-slate-500 font-mono">Loading contests and segments...</div>
        </div>
      ) : !segments || segments.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E2E8F0] rounded-2xl shadow-xs">
          <Trophy className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <div className="font-bold text-slate-800">No events currently scheduled</div>
          <p className="text-xs text-slate-500 mt-1">Check back shortly as fest organizers publish segments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {segments.map((seg) => {
            const filled = seg.maxCapacity - seg.seatsLeft;
            const percent = Math.min(
              100,
              Math.round((filled / (seg.maxCapacity || 1)) * 100)
            );
            const isSolo = (seg.participationType || "SOLO") === "SOLO";

            return (
              <div
                key={seg.id}
                onClick={() => router.push(`/dashboard/events/${seg.id}`)}
                className="p-6 rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#2563EB]/60 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group min-w-0 overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md">
                        {seg.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          isSolo
                            ? "bg-blue-50 text-[#2563EB] border border-blue-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {seg.participationType || "SOLO"}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        seg.registrationFee === 0
                          ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                          : "bg-slate-100 text-slate-800 border border-[#E2E8F0]"
                      }`}
                    >
                      {seg.registrationFee === 0 ? "FREE" : `${seg.registrationFee} BDT`}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors tracking-tight">
                    {seg.title}
                  </h3>

                  {seg.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                      {seg.description}
                    </p>
                  )}

                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                      <span>Seats Left:</span>
                      <span className={seg.seatsLeft > 0 ? "text-[#059669] font-bold" : "text-rose-600 font-bold"}>
                        {seg.seatsLeft > 0 ? `${seg.seatsLeft} slots` : "CLOSED"}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          percent > 85 ? "bg-rose-500" : "bg-[#2563EB]"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 text-right">
                      {filled} / {seg.maxCapacity} enrolled ({percent}%)
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                  {isOrganizer ? (
                    <button
                      type="button"
                      onClick={(e) => openEditModal(seg, e)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Event
                    </button>
                  ) : (
                    <span className="text-xs font-mono text-slate-400">
                      Event #{seg.id}
                    </span>
                  )}

                  <span className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] group-hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1">
                    View & Enroll <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL: CREATE EVENT (ORGANIZER) ─────────────────────────────── */}
      {isOrganizer && isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  + Create Contest / Event
                </h3>
                <p className="text-xs text-slate-500">
                  Publish a new competition or segment for participants
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={createData.title}
                  onChange={(e) => setCreateData({ ...createData, title: e.target.value })}
                  placeholder="e.g. Speed Coding Championship"
                  className="w-full py-2 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={createData.category}
                    onChange={(e) => setCreateData({ ...createData, category: e.target.value })}
                    className="w-full py-2 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none text-slate-800"
                  >
                    <option value="Programming">Programming</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Showcase">Showcase</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Sports">Sports</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Participation Type
                  </label>
                  <select
                    value={createData.participationType}
                    onChange={(e) =>
                      setCreateData({
                        ...createData,
                        participationType: e.target.value as ParticipationType,
                      })
                    }
                    className="w-full py-2 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none text-slate-800 font-semibold"
                  >
                    <option value="SOLO">SOLO (Individual)</option>
                    <option value="TEAM">TEAM (Squad)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Entry Fee (0 for Free)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={createData.registrationFee}
                    onChange={(e) =>
                      setCreateData({ ...createData, registrationFee: e.target.value })
                    }
                    placeholder="0 BDT"
                    className="w-full py-2 px-3 text-xs font-mono bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={createData.maxCapacity}
                    onChange={(e) =>
                      setCreateData({ ...createData, maxCapacity: e.target.value })
                    }
                    placeholder="50"
                    className="w-full py-2 px-3 text-xs font-mono bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={createData.description}
                  onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                  placeholder="Rules, venue, or contest timing..."
                  className="w-full py-2 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {createMutation.isPending ? "Publishing..." : "Publish Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT EVENT (ORGANIZER) ───────────────────────────────── */}
      {isOrganizer && editingSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Edit Event #{editingSegment.id}
                </h3>
                <p className="text-xs text-slate-500">
                  Update segment configuration, fee, or capacity
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSegment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full py-2 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={editData.category}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    className="w-full py-2 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none text-slate-800"
                  >
                    <option value="Programming">Programming</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Showcase">Showcase</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Sports">Sports</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Participation Type
                  </label>
                  <select
                    value={editData.participationType}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        participationType: e.target.value as ParticipationType,
                      })
                    }
                    className="w-full py-2 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none text-slate-800 font-semibold"
                  >
                    <option value="SOLO">SOLO</option>
                    <option value="TEAM">TEAM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Entry Fee (0 for Free)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editData.registrationFee}
                    onChange={(e) =>
                      setEditData({ ...editData, registrationFee: e.target.value })
                    }
                    className="w-full py-2 px-3 text-xs font-mono bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editData.maxCapacity}
                    onChange={(e) =>
                      setEditData({ ...editData, maxCapacity: e.target.value })
                    }
                    className="w-full py-2 px-3 text-xs font-mono bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full py-2 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSegment(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
