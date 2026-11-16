"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  CreditCard,
  Shield,
  Layers,
  Send,
  UserCheck,
} from "lucide-react";
import {
  segmentsApi,
  segmentRegistrationsApi,
  usersApi,
  getApiErrorMessage,
} from "@/lib/api";
import type {
  Segment,
  SegmentRegistration,
  SegmentPaymentStatus,
  User,
} from "@/types/fest";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const segmentId = Number(params.id);

  // Current logged in user
  const { data: currentUser } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => usersApi.getMe(),
  });

  const isOrganizer =
    currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "CONVENOR";

  // Segment Details
  const { data: segment, isLoading: segmentLoading, error: segmentError } = useQuery({
    queryKey: ["segment", segmentId],
    queryFn: () => segmentsApi.getSegmentById(segmentId),
    enabled: !!segmentId,
  });

  // Registrations for this segment
  const { data: registrationsResponse, isLoading: regLoading } = useQuery({
    queryKey: ["segmentRegistrations", segmentId],
    queryFn: () => segmentRegistrationsApi.getAll({ segmentId, limit: 2000 }),
    enabled: !!segmentId,
  });

  // User's own registrations
  const { data: myRegistrations } = useQuery({
    queryKey: ["myRegistrations"],
    queryFn: () => segmentRegistrationsApi.getMy(),
  });

  // Form inputs
  const [soloHandle, setSoloHandle] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamMembers, setTeamMembers] = useState("");

  const isAlreadyRegistered = myRegistrations?.some(
    (r) => r.segmentId === segmentId
  );
  const myRegistration = myRegistrations?.find((r) => r.segmentId === segmentId);

  // Register Mutation
  const registerMutation = useMutation({
    mutationFn: (data: { segmentId: number; teamOrDetails?: string }) =>
      segmentRegistrationsApi.register(data),
    onSuccess: () => {
      toast.success("Successfully registered for event!");
      setSoloHandle("");
      setTeamName("");
      setTeamMembers("");
      queryClient.invalidateQueries({ queryKey: ["segment", segmentId] });
      queryClient.invalidateQueries({ queryKey: ["segmentRegistrations", segmentId] });
      queryClient.invalidateQueries({ queryKey: ["myRegistrations"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to register for event"));
    },
  });

  // Mark Fee Paid Mutation (Organizer)
  const markPaidMutation = useMutation({
    mutationFn: ({
      regId,
      status,
    }: {
      regId: number;
      status: SegmentPaymentStatus;
    }) => segmentRegistrationsApi.updatePayment(regId, status),
    onSuccess: () => {
      toast.success("Payment marked as PAID for participant!");
      queryClient.invalidateQueries({ queryKey: ["segmentRegistrations", segmentId] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to update payment status"));
    },
  });

  // Cancel My Registration Mutation (Student)
  const cancelRegistrationMutation = useMutation({
    mutationFn: () => segmentsApi.cancelMyRegistration(segmentId),
    onSuccess: () => {
      toast.success("Contest registration cancelled. Reserved seat released.");
      queryClient.invalidateQueries({ queryKey: ["segment", segmentId] });
      queryClient.invalidateQueries({ queryKey: ["segmentRegistrations", segmentId] });
      queryClient.invalidateQueries({ queryKey: ["myRegistrations"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to cancel registration"));
    },
  });

  // Remove Participant Mutation (Organizer)
  const removeParticipantMutation = useMutation({
    mutationFn: (registrationId: number) =>
      segmentsApi.removeRegistration(segmentId, registrationId),
    onSuccess: () => {
      toast.success("Participant removed and seat released.");
      queryClient.invalidateQueries({ queryKey: ["segment", segmentId] });
      queryClient.invalidateQueries({ queryKey: ["segmentRegistrations", segmentId] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to remove participant"));
    },
  });

  const handleCancelMyRegistration = () => {
    if (
      window.confirm(
        "Cancel your registration for this event? Your reserved seat will be released."
      )
    ) {
      cancelRegistrationMutation.mutate();
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isTeam = (segment?.participationType || "SOLO") === "TEAM";

    let details = "";
    if (isTeam) {
      if (!teamName.trim()) {
        toast.error("Please enter a Team Name");
        return;
      }
      if (!teamMembers.trim()) {
        toast.error("Please enter Team Member Rolls / IDs");
        return;
      }
      details = `Team: ${teamName.trim()} | Members: ${teamMembers.trim()}`;
    } else {
      if (!soloHandle.trim()) {
        toast.error("Please enter your Gamer Tag or handle");
        return;
      }
      details = soloHandle.trim();
    }

    registerMutation.mutate({
      segmentId,
      teamOrDetails: details,
    });
  };

  if (segmentLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin mb-3" />
        <div className="text-xs font-mono text-slate-500">Loading event arena details...</div>
      </div>
    );
  }

  if (segmentError || !segment) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <Trophy className="w-10 h-10 text-slate-400 mb-2" />
        <h2 className="text-base font-bold text-slate-800">Event Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          This event may have been removed or is temporarily unavailable.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] rounded-xl shadow-sm"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Combine registrations from endpoint or nested segment
  const registrations: SegmentRegistration[] =
    registrationsResponse?.data || segment.registrations || [];

  const filled = segment.maxCapacity - segment.seatsLeft;
  const percent = Math.min(
    100,
    Math.round((filled / (segment.maxCapacity || 1)) * 100)
  );
  const isTeam = (segment.participationType || "SOLO") === "TEAM";
  const isFree = segment.registrationFee === 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-4 sm:p-8 selection:bg-[#2563EB] selection:text-white min-w-0 w-full max-w-full overflow-x-hidden">
      <div className="max-w-5xl mx-auto space-y-6 min-w-0 w-full">
        {/* ─── BREADCRUMB / BACK ────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <span className="text-xs font-mono text-slate-400">
            Event Arena #{segment.id}
          </span>
        </div>

        {/* ─── EVENT DETAILS HERO CARD ──────────────────────────────────── */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md">
                  {segment.category}
                </span>
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded ${
                    isTeam
                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                      : "bg-blue-50 text-[#2563EB] border border-blue-200"
                  }`}
                >
                  {segment.participationType || "SOLO"}
                </span>
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded ${
                    isFree
                      ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                      : "bg-slate-100 text-slate-800 border border-[#E2E8F0]"
                  }`}
                >
                  {isFree ? "FREE ENTRY" : `${segment.registrationFee} BDT`}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {segment.title}
              </h1>

              {segment.description && (
                <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                  {segment.description}
                </p>
              )}
            </div>

            {/* Live Seats Left Indicator */}
            <div className="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] min-w-[200px] shrink-0 text-right">
              <div className="text-xs text-slate-500 font-medium">Available Seats</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                {segment.seatsLeft > 0 ? (
                  <span className="text-[#059669]">{segment.seatsLeft}</span>
                ) : (
                  <span className="text-rose-600">FULL</span>
                )}{" "}
                <span className="text-xs font-normal text-slate-400">/ {segment.maxCapacity}</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full ${percent > 85 ? "bg-rose-500" : "bg-[#2563EB]"}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                {filled} slots booked ({percent}%)
              </div>
            </div>
          </div>
        </div>

        {/* ─── REGISTRATION CARD ────────────────────────────────────────── */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
            <Trophy className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-base font-bold text-slate-900">
              Contest Registration
            </h2>
          </div>

          {isAlreadyRegistered ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-800">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
                <div>
                  <div className="font-bold text-[#059669]">
                    You are registered for this event!
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    Details: <strong>{myRegistration?.teamOrDetails || "Solo participant"}</strong>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                    myRegistration?.paymentStatus === "PAID" || myRegistration?.paymentStatus === "FREE"
                      ? "bg-emerald-100 text-[#059669]"
                      : "bg-amber-100 text-[#D97706]"
                  }`}
                >
                  Payment: {myRegistration?.paymentStatus}
                </span>

                {myRegistration?.paymentStatus === "FREE" || myRegistration?.paymentStatus === "PENDING" ? (
                  <button
                    type="button"
                    onClick={handleCancelMyRegistration}
                    disabled={cancelRegistrationMutation.isPending}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    {cancelRegistrationMutation.isPending ? "Cancelling..." : "Cancel Registration"}
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 italic">
                    Paid entry locked — contact Convenor to modify
                  </span>
                )}
              </div>
            </div>
          ) : segment.seatsLeft <= 0 ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold text-center">
              Registrations for this event are fully booked.
            </div>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 max-w-xl">
              {isTeam ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Team Name
                    </label>
                    <input
                      type="text"
                      required
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. CodeStorm 8A"
                      className="w-full py-2.5 px-3.5 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Team Member Rolls / Student IDs
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={teamMembers}
                      onChange={(e) => setTeamMembers(e.target.value)}
                      placeholder="e.g. 11210320631 (Lead), 11210320652, 11210320676"
                      className="w-full py-2.5 px-3.5 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Gamer Tag / Handle / Platform Username
                  </label>
                  <input
                    type="text"
                    required
                    value={soloHandle}
                    onChange={(e) => setSoloHandle(e.target.value)}
                    placeholder="e.g. CodeNinja / eFootball ID: 123456"
                    className="w-full py-2.5 px-3.5 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="py-2.5 px-5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {registerMutation.isPending ? "Submitting..." : "Confirm & Register for Event"}
              </button>
            </form>
          )}
        </div>

        {/* ─── LIVE REGISTERED PLAYERS/TEAMS TABLE ───────────────────────── */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs min-w-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-sm font-bold text-slate-900">
                Registered Participants & Teams ({registrations.length})
              </h3>
            </div>
            {isOrganizer && (
              <span className="text-[11px] font-semibold text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-lg">
                Organizer Payment Controls Enabled
              </span>
            )}
          </div>

          {regLoading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              Loading participant roster...
            </div>
          ) : registrations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">
              No participants registered for this event yet. Be the first!
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Participant / Team</th>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Tag / Details</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4">Registered At</th>
                    {isOrganizer && <th className="py-3 px-4 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {registrations.map((reg, idx) => {
                    const isPaid = reg.paymentStatus === "PAID" || reg.paymentStatus === "FREE";
                    const isPending = reg.paymentStatus === "PENDING";

                    return (
                      <tr key={reg.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {reg.user?.name || "Participant"}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {reg.user?.studentId || "—"}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                          {reg.teamOrDetails || "—"}
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
                            {reg.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {new Date(reg.registeredAt).toLocaleDateString()}
                        </td>

                        {isOrganizer && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending ? (
                                <button
                                  type="button"
                                  disabled={markPaidMutation.isPending}
                                  onClick={() =>
                                    markPaidMutation.mutate({
                                      regId: reg.id,
                                      status: "PAID",
                                    })
                                  }
                                  className="px-2.5 py-1 text-xs font-semibold text-white bg-[#059669] hover:bg-emerald-700 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Mark Fee Paid
                                </button>
                              ) : (
                                <span className="text-[11px] text-[#059669] font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Confirmed
                                </span>
                              )}

                              <button
                                type="button"
                                disabled={removeParticipantMutation.isPending}
                                onClick={() => {
                                  if (reg.paymentStatus === "PAID") {
                                    if (
                                      window.confirm(
                                        `This participant is marked PAID (${segment.registrationFee} BDT). Removing them will void their entry and deduct ${segment.registrationFee} BDT from Contest Revenue. Continue?`
                                      )
                                    ) {
                                      removeParticipantMutation.mutate(reg.id);
                                    }
                                  } else {
                                    if (
                                      window.confirm(
                                        `Remove participant ${reg.user?.name || "Participant"} from this contest?`
                                      )
                                    ) {
                                      removeParticipantMutation.mutate(reg.id);
                                    }
                                  }
                                }}
                                className="px-2 py-1 text-xs font-semibold rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                Remove
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
      </div>
    </div>
  );
}
