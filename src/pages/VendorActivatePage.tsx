/**
 * VendorActivatePage — set-password page for vendor activation links.
 *
 * Route: /vendor/activate/:uid/:token/
 *
 * Flow:
 * 1. Validate token on mount
 * 2. Show password form
 * 3. Submit to set password
 * 4. Redirect to login on success
 */

import { useEffect } from "react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { validateActivationToken, setActivationPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export default function VendorActivatePage() {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  const validateMutation = useMutation({
    mutationFn: () => validateActivationToken(uid!, token!),
    onError: (err: ApiError) => {
      setErrorMessage(err.message || "This activation link is invalid or has expired.");
    },
  });

  // Trigger validation on mount
  useEffect(() => {
    validateMutation.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const passwordMutation = useMutation({
    mutationFn: (pw: string) => setActivationPassword({ uid: uid!, token: token!, password: pw }),
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    },
    onError: (err: ApiError) => {
      setErrorMessage(err.message || "Failed to set password. Please try again.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    passwordMutation.mutate(password);
  }

  if (validateMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validating activation link…</p>
        </div>
      </div>
    );
  }

  if (validateMutation.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <span className="text-2xl">🔗</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">Invalid Activation Link</h1>
              <p className="text-sm text-muted-foreground">
                {validateMutation.error instanceof ApiError
                  ? validateMutation.error.message
                  : "This link may have expired or already been used."}
              </p>
            </div>
            <a
              href="/login"
              className="mt-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">Account Activated!</h1>
              <p className="text-sm text-muted-foreground">
                Your vendor account is now active. Redirecting you to log in…
              </p>
            </div>
            <a
              href="/login"
              className="mt-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  const vendorName = validateMutation.data?.vendor_name ?? "";
  const isSubmitting = passwordMutation.isPending;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Top / Left panel */}
      <div className="flex flex-col lg:w-[52%] lg:shrink-0 bg-primary lg:bg-white">

        {/* Mobile-only: compact brand header */}
        <div className="flex flex-col items-center justify-center py-10 px-6 border-b border-white/15 lg:hidden">
          <img src="/hp.jpg" alt="Horizon Industrial Parks" className="h-14 w-auto object-contain mb-2" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
            Vendor Invoice Management System
          </p>
        </div>

        {/* Desktop-only: branding + features */}
        <div className="hidden lg:flex flex-col h-full">
          <div className="px-10 pt-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              Vendor Invoice Management System
            </p>
            <div className="inline-block mt-3">
              <img src="/hp.jpg" alt="Horizon Industrial Parks" className="h-12 w-auto object-contain" />
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center px-10 pb-10">
            <div className="max-w-xl space-y-8">
              <div className="space-y-4">
                <h2 className="text-5xl font-extrabold text-primary leading-tight tracking-tight">
                  Activate Your Vendor Account
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed font-medium">
                  Set up your password to access your vendor portal and start managing invoices, payments, and more.
                </p>
              </div>

              <div className="space-y-6 pt-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Submit Invoices Easily</h3>
                    <p className="text-sm text-gray-600">Upload invoices in any format — our system automatically extracts and validates the details.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Track Payment Status</h3>
                    <p className="text-sm text-gray-600">Monitor your invoice approvals and payment status in real-time from your dashboard.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Secure Portal Access</h3>
                    <p className="text-sm text-gray-600">Your account and data are protected with enterprise-grade security measures.</p>
                  </div>
                </div>
              </div>

              {vendorName && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xs text-gray-500 mb-1">Activating account for</p>
                  <p className="text-sm font-semibold text-gray-900">{vendorName}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom / Right panel — password form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-primary">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <h2 className="text-2xl font-bold font-display text-white">Set Your Password</h2>
          <p className="text-white/75 mt-1 mb-8">
            Create a secure password to activate your vendor portal access.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-white/90 mb-1.5 block">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 rounded-xl border border-white/25 bg-white/15 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/60 transition-all text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-white/90 mb-1.5 block">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl border border-white/25 bg-white/15 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/60 transition-all text-sm"
              />
            </div>

            {errorMessage && (
              <div className="px-4 py-3 rounded-xl bg-black/20 border border-white/20 text-white text-sm">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-white text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/90 transition-opacity shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Activating…
                </>
              ) : (
                <>
                  Activate Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-white/50 text-xs mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-white font-medium hover:underline">
              Sign in
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
