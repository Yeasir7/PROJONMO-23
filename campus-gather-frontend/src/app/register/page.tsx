"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UserPlus,
  Search,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react";
import { authApi, usersApi, getApiErrorMessage, sectionsApi } from "@/lib/api";
import { Navbar } from "@/components/navbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TshirtSize } from "@/types/fest";

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Check if user is already logged in
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => {
    setHasToken(typeof window !== "undefined" && !!localStorage.getItem("accessToken"));
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => usersApi.getMe(),
    enabled: hasToken,
    retry: false,
  });

  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["sections"],
    queryFn: () => sectionsApi.getAll(),
  });

  const [studentId, setStudentId] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedStudent, setVerifiedStudent] = useState<{
    studentId: string;
    fullName: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    sectionId: "",
    tshirtSize: "L" as TshirtSize,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignOut = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
      }
      setHasToken(false);
      await authApi.logout();
      queryClient.clear();
      toast.success("Signed out successfully");
      router.refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to sign out"));
    }
  };

  // Step 1: Verify Student ID against whitelist
  const handleVerifyStudentId = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = studentId.trim();

    if (!cleanId || cleanId.length !== 11 || !/^\d+$/.test(cleanId)) {
      toast.error("Please enter a valid 11-digit Student ID (e.g. 11230121177)");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await authApi.verifyStudentId(cleanId);
      if (res.isClaimed) {
        toast.error("This Student ID has already been registered. Please sign in to access your portal.");
        return;
      }
      setVerifiedStudent({
        studentId: res.studentId,
        fullName: res.fullName,
      });
      setFormData((prev) => ({
        ...prev,
        name: res.fullName,
      }));
      toast.success(`Verified: ${res.fullName}`);
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Student ID not found in whitelisted CSE Fall 2026 registry."
        )
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 2: Submit Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verifiedStudent) {
      toast.error("Please verify your 11-digit Student ID first.");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Full name is required.");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Phone number is required.");
      return;
    }
    if (!formData.sectionId) {
      toast.error("Please select your academic section.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authApi.register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        studentId: verifiedStudent.studentId,
        phone: formData.phone.trim(),
        sectionId: Number(formData.sectionId),
        tshirtSize: formData.tshirtSize,
      });

      if (response?.accessToken && typeof window !== "undefined") {
        localStorage.setItem("accessToken", response.accessToken);
        setHasToken(true);
      }

      queryClient.clear();

      toast.success("Registration successful! Welcome to Campus Gather.");
      router.push("/dashboard");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Registration failed. Please check your information."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const tshirtSizes: TshirtSize[] = ["S", "M", "L", "XL", "XXL"];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      <Navbar />

      <div className="min-h-[calc(100vh-4rem)] flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Already Logged In Banner */}
        {currentUser && (
          <Card className="max-w-lg w-full mb-6 border-indigo-200 bg-indigo-50/60 shadow-sm">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-slate-900">
                    You are already signed in as {currentUser.name}
                  </div>
                  <div className="text-slate-600 flex items-center gap-1.5 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] uppercase py-0 px-1.5 bg-indigo-100 text-indigo-700">
                      {currentUser.role}
                    </Badge>
                    <span>{currentUser.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <Link
                  href="/dashboard"
                  className={buttonVariants({ variant: "default", size: "sm", className: "w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700" })}
                >
                  Go to Dashboard
                  <ArrowRight className="size-3.5 ml-1" />
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Crisp Centered Registration Card */}
        <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-lg">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-[10px]">
                P23
              </div>
              <Badge className="border-transparent bg-indigo-100 text-indigo-800 text-[10px]">
                PROJONMO &apos;23 • NUBTK CSE FEST
              </Badge>
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              Student Registration
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Exclusive to whitelisted CSE students. Enter your 11-digit roll to verify.
            </p>
          </div>

          <div className="space-y-5">
            {/* ─── STEP 1: VERIFY ID ────────────────────────────────────── */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <Label htmlFor="student-id" className="text-xs font-semibold text-slate-700">
                Step 1: Enter 11-Digit CSE Student ID
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="student-id"
                    type="text"
                    maxLength={11}
                    disabled={!!verifiedStudent || isVerifying}
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 11210320631"
                    className="h-10 border-slate-300 text-slate-900 focus:border-indigo-500"
                  />
                </div>
                {verifiedStudent ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVerifiedStudent(null);
                      setStudentId("");
                      setFormData((prev) => ({ ...prev, name: "" }));
                    }}
                    className="border-slate-300 text-slate-700"
                  >
                    Change ID
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleVerifyStudentId}
                    disabled={isVerifying || studentId.trim().length !== 11}
                    size="sm"
                    className="gap-1.5 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    {isVerifying ? (
                      <>
                        <div className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Search className="size-3.5" />
                        Verify ID
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Verified Banner */}
              {verifiedStudent && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900">{verifiedStudent.fullName}</span>
                      <span className="text-slate-500 ml-1.5 font-sans">({verifiedStudent.studentId})</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-transparent">
                    Whitelisted
                  </Badge>
                </div>
              )}
            </div>

            {/* ─── STEP 2: REGISTRATION FORM (LOCKED UNTIL VERIFIED) ───── */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!verifiedStudent && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                  <Lock className="size-3.5 shrink-0 text-amber-600" />
                  <span>Verify your 11-digit Student ID above to unlock the registration fields.</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="full-name" className="text-xs font-semibold text-slate-700">
                  Official Full Name (Auto-filled from registry)
                </Label>
                <Input
                  id="full-name"
                  type="text"
                  readOnly
                  value={formData.name}
                  placeholder="Verify ID above to load official name"
                  className="h-10 bg-slate-100 border-slate-300 font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-email" className="text-xs font-semibold text-slate-700">
                    Email Address
                  </Label>
                  <Input
                    id="reg-email"
                    type="email"
                    required
                    disabled={!verifiedStudent}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="student@example.com"
                    className="h-10 border-slate-300 text-slate-900 focus:border-indigo-500 disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-password" className="text-xs font-semibold text-slate-700">
                    Password
                  </Label>
                  <Input
                    id="reg-password"
                    type="password"
                    required
                    minLength={6}
                    disabled={!verifiedStudent}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="At least 6 characters"
                    className="h-10 border-slate-300 text-slate-900 focus:border-indigo-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-phone" className="text-xs font-semibold text-slate-700">
                    Phone Number
                  </Label>
                  <Input
                    id="reg-phone"
                    type="tel"
                    required
                    disabled={!verifiedStudent}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01700000000"
                    className="h-10 border-slate-300 text-slate-900 focus:border-indigo-500 disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-section" className="text-xs font-semibold text-slate-700">
                    Academic Section (Semesters 1-8)
                  </Label>
                  {sectionsLoading ? (
                    <div className="py-2 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500">
                      Loading sections...
                    </div>
                  ) : (
                    <select
                      id="reg-section"
                      required
                      disabled={!verifiedStudent}
                      value={formData.sectionId}
                      onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
                    >
                      <option value="">-- Select Section --</option>
                      {sections?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} (Semester {s.semester}) — {s.festFee > 0 ? `${s.festFee} BDT` : "Fee TBD"}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Official T-Shirt Size
                </Label>
                <div className="mt-1.5 grid grid-cols-5 gap-2">
                  {tshirtSizes.map((size) => {
                    const isSelected = formData.tshirtSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={!verifiedStudent}
                        onClick={() => setFormData({ ...formData, tshirtSize: size })}
                        className={`py-2 text-center text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          !verifiedStudent
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !verifiedStudent}
                className="w-full h-11 py-2.5 text-sm font-semibold gap-2 mt-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Completing Registration...
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" />
                    Complete Registration
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline ml-1">
              Sign In here -&gt;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
