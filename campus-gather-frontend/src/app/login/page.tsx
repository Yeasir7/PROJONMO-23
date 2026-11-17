"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { ArrowRight, CheckCircle2, KeyRound, LogIn } from "lucide-react";
import { authApi, usersApi, getApiErrorMessage } from "@/lib/api";
import { Navbar } from "@/components/navbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error("Google authentication failed. No credential received.");
      return;
    }

    setIsGoogleSubmitting(true);
    try {
      const response = await authApi.googleLogin(credentialResponse.credential);

      if (response?.accessToken && typeof window !== "undefined") {
        localStorage.setItem("accessToken", response.accessToken);
        setHasToken(true);
      }

      queryClient.clear();
      toast.success(`Welcome back, ${response.user?.name || "Participant"}!`);
      router.push("/dashboard");
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "No account found linked to this Google email. Please register with your Student ID first."
        )
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  // Forgot Password State
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      toast.error("Please enter your Student ID or Email");
      return;
    }

    setIsForgotSubmitting(true);
    try {
      const res = await authApi.forgotPassword(forgotIdentifier.trim());
      setForgotSuccess(res.maskedEmail);
      toast.success(`Password reset email sent to ${res.maskedEmail}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to send password reset email"));
    } finally {
      setIsForgotSubmitting(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Please provide both Student ID / email and password");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authApi.login({
        email: email.trim(),
        password,
      });

      if (response?.accessToken && typeof window !== "undefined") {
        localStorage.setItem("accessToken", response.accessToken);
        setHasToken(true);
      }

      queryClient.clear();

      toast.success(`Welcome back, ${response.user?.name || "Participant"}!`);
      router.push("/dashboard");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Invalid email or password. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      <Navbar />

      <div className="min-h-[calc(100vh-4rem)] flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Already Logged In Banner */}
        {currentUser && (
          <Card className="max-w-md w-full mb-6 border-indigo-200 bg-indigo-50/60 shadow-sm">
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

        {/* Crisp Centered Login Card */}
        <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-lg">
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
              Sign In to Portal
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Access your Fest Pass, register for contests, or manage section treasury.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-identifier" className="text-xs font-semibold text-slate-700">
                Student ID or Email Address
              </Label>
              <Input
                id="login-identifier"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. 11230121177 or yeasir@csefest.com"
                className="h-10 border-slate-300 text-slate-900 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-xs font-semibold text-slate-700">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen(true);
                    setForgotSuccess(null);
                    setForgotIdentifier(email || "");
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-500 hover:underline font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 border-slate-300 text-slate-900 focus:border-indigo-500"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 py-2.5 text-sm font-semibold gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-md shadow-indigo-600/20"
            >
              {isSubmitting ? (
                <>
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="size-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider text-[11px]">
                Or continue with
              </span>
            </div>
          </div>

          <div className="w-full flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() =>
                toast.error("Google sign in was unsuccessful. Please try again.")
              }
              text="continue_with"
              shape="rectangular"
              size="large"
              width="100%"
            />
          </div>

          {isGoogleSubmitting && (
            <div className="flex items-center justify-center gap-2 text-xs text-indigo-600 font-medium pt-3 animate-pulse">
              <div className="size-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              Signing in with Google...
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Need an account?{" "}
            <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline ml-1">
              Verify Student ID &amp; Register -&gt;
            </Link>
          </div>
        </div>

        {/* Forgot Password Dialog */}
        <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
          <DialogContent className="sm:max-w-md bg-white text-slate-900 border-slate-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <KeyRound className="size-4 text-indigo-600" />
                Reset Password
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Enter your 11-Digit Student ID or registered email address to receive an auto-generated password via Brevo email.
              </DialogDescription>
            </DialogHeader>

            {forgotSuccess ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-xs text-emerald-800">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    Password Reset Sent Successfully
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-800">
                    A new password has been sent to <strong>{forgotSuccess}</strong>. Use it to sign in, then update your password anytime from your Fest Pass profile.
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    className="w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => {
                      setForgotOpen(false);
                      setForgotSuccess(null);
                    }}
                  >
                    Back to Sign In
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-identifier" className="text-xs font-semibold text-slate-700">
                    11-Digit Student ID or Email
                  </Label>
                  <Input
                    id="forgot-identifier"
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="e.g. 11230121177 or student@csefest.com"
                    className="h-10 text-xs border-slate-300 text-slate-900"
                  />
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForgotOpen(false)}
                    disabled={isForgotSubmitting}
                    className="text-xs border-slate-300 text-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isForgotSubmitting}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                  >
                    {isForgotSubmitting ? (
                      <>
                        <div className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send New Password to Email"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
