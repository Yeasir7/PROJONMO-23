"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Shirt,
  Clock,
  Lock,
  Mail,
  Phone,
  KeyRound,
  GraduationCap,
  Save,
} from "lucide-react";
import type { User } from "@/types/fest";
import { sectionsApi, usersApi, getApiErrorMessage } from "@/lib/api";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TSHIRT_SIZES = ["S", "M", "L", "XL", "XXL"] as const;

export function FestPassTab({ user }: { user: User }) {
  const queryClient = useQueryClient();

  const isPaid = user.festFeeStatus === "PAID_TO_CR";
  const festFee = user.section?.festFee ?? 0;
  const isFeeTBD = festFee === 0 && !isPaid;

  // Form State
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [tshirtSize, setTshirtSize] = useState<string>(user.tshirtSize || "L");
  const [sectionId, setSectionId] = useState<string>(
    user.sectionId ? user.sectionId.toString() : ""
  );
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setTshirtSize(user.tshirtSize || "L");
    setSectionId(user.sectionId ? user.sectionId.toString() : "");
  }, [user]);

  // Load sections for academic section dropdown
  const { data: sections = [] } = useQuery({
    queryKey: ["sections"],
    queryFn: () => sectionsApi.getAll(),
  });

  const sortedSections = [...sections].sort((a, b) => {
    if (a.semester !== b.semester) return a.semester - b.semester;
    return a.code.localeCompare(b.code);
  });

  // Section lock rules
  const isSectionChangeAllowed =
    user.festFeeStatus === "UNPAID" && user.role === "STUDENT";

  const lockBadgeText =
    user.role === "CR"
      ? "Locked for Section CR"
      : user.festFeeStatus === "PAID_TO_CR"
      ? "Locked after fee payment"
      : user.role !== "STUDENT"
      ? "Locked for Staff"
      : null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload: {
        email?: string;
        phone?: string;
        tshirtSize?: "S" | "M" | "L" | "XL" | "XXL";
        sectionId?: number;
        newPassword?: string;
      } = {};

      if (email.trim() && email.trim() !== user.email) {
        payload.email = email.trim();
      }
      if (phone.trim() !== (user.phone || "")) {
        payload.phone = phone.trim();
      }
      if (tshirtSize !== user.tshirtSize) {
        payload.tshirtSize = tshirtSize as "S" | "M" | "L" | "XL" | "XXL";
      }
      if (
        isSectionChangeAllowed &&
        sectionId &&
        Number(sectionId) !== user.sectionId
      ) {
        payload.sectionId = Number(sectionId);
      }
      if (newPassword.trim()) {
        if (newPassword.length < 6) {
          toast.error("New password must be at least 6 characters long");
          setIsSaving(false);
          return;
        }
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        toast.info("No profile changes detected");
        setIsSaving(false);
        return;
      }

      await usersApi.updateMyProfile(payload);

      // Invalidate relevant query caches
      queryClient.invalidateQueries({ queryKey: ["user-me"] });
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "summary"] });

      toast.success("Profile updated successfully!");
      setNewPassword("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update profile"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 w-full">
      {/* ─── COMPACT STATUS SUMMARY BAR ───────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
        {/* Fest Fee Status Pill */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isPaid
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : isFeeTBD
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {isPaid ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>PAID • {user.paidAmount || festFee} BDT</span>
            </>
          ) : isFeeTBD ? (
            <>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>UNPAID • Fee TBD</span>
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>UNPAID • Due {festFee} BDT</span>
            </>
          )}
        </span>

        {/* Kit / Jersey Status Pill */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            user.kitDelivered
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-slate-100 text-slate-700 border border-slate-200"
          }`}
        >
          <Shirt className="w-3.5 h-3.5 text-slate-500" />
          <span>{user.kitDelivered ? "Kit Delivered" : "Kit Pending"}</span>
        </span>

        {/* Committee Role Pill(s) */}
        {user.committeeMemberships && user.committeeMemberships.length > 0 && (
          user.committeeMemberships.map((membership) => (
            <span
              key={membership.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
            >
              <span>
                {membership.designation === "LEAD" ? "Lead" : "Member"} • {membership.committee?.name || "Committee"}
              </span>
            </span>
          ))
        )}
      </div>

      {/* ─── EDIT PROFILE & PREFERENCES FORM ─────────────────────────── */}
      <Card className="shadow-none border-0 bg-transparent">
        <form onSubmit={handleSaveProfile}>
          <CardContent className="space-y-4 pt-1 px-0">
            {/* Academic Section */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="profile-section" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <GraduationCap className="size-3.5 text-slate-500" />
                  Academic Section (1A–8C)
                </Label>
                {lockBadgeText && (
                  <Badge variant="outline" className="text-[10px] font-medium text-amber-700 bg-amber-50 border-amber-200 flex items-center gap-1 py-0 px-1.5">
                    <Lock className="size-2.5" />
                    {lockBadgeText}
                  </Badge>
                )}
              </div>

              <select
                id="profile-section"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={!isSectionChangeAllowed}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
              >
                <option value="">-- Select Section --</option>
                {sortedSections.map((sec) => (
                  <option key={sec.id} value={sec.id.toString()}>
                    {sec.code} (Semester {sec.semester})
                  </option>
                ))}
              </select>

              <p className="text-[11px] text-slate-500">
                {isSectionChangeAllowed
                  ? "You may switch sections while your fee is UNPAID."
                  : "Section changes are locked once your fee is marked paid to CR or if you are a CR."}
              </p>
            </div>

            {/* T-Shirt Size */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-tshirt" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Shirt className="size-3.5 text-slate-500" />
                T-Shirt Size (S, M, L, XL, XXL)
              </Label>
              <select
                id="profile-tshirt"
                value={tshirtSize}
                onChange={(e) => setTshirtSize(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
              >
                {TSHIRT_SIZES.map((size) => (
                  <option key={size} value={size}>
                    Size {size}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Live updates the committee&apos;s T-Shirt Order Matrix immediately upon saving.
              </p>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-email" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Mail className="size-3.5 text-slate-500" />
                Email Address
              </Label>
              <Input
                id="profile-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="h-10 text-sm border-slate-200 text-slate-900 focus:border-indigo-500"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-phone" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Phone className="size-3.5 text-slate-500" />
                Phone Number
              </Label>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 01712345678"
                className="h-10 text-sm border-slate-200 text-slate-900 focus:border-indigo-500"
              />
            </div>

            {/* New Password (Optional) */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <Label htmlFor="profile-newpassword" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="size-3.5 text-slate-500" />
                New Password (Optional)
              </Label>
              <Input
                id="profile-newpassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="h-10 text-sm border-slate-200 text-slate-900 focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500">
                Leave blank to keep your current password. Recommended after logging in with a temporary reset password.
              </p>
            </div>
          </CardContent>

          <CardFooter className="pt-3 px-0 border-t border-slate-100 flex justify-end">
            <Button
              type="submit"
              disabled={isSaving}
              className="gap-2 text-xs font-semibold h-10 px-5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-sm"
            >
              {isSaving ? (
                <>
                  <div className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  Save Preferences
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
