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
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
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

  const inputCls = "w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm pr-12";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-primary relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-20 w-96 h-96 rounded-full bg-primary-foreground/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-72 h-72 rounded-full bg-primary-foreground/10 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-primary-foreground/20 flex items-center justify-center mb-8">
            <span className="text-primary-foreground font-bold text-lg font-display">IF</span>
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground font-display leading-tight">
            InvoFlow
          </h1>
          <p className="mt-4 text-primary-foreground/70 text-lg max-w-md">
            Vendor self-service portal
          </p>
        </div>
        {vendorName && (
          <div className="relative z-10 p-4 rounded-xl bg-primary-foreground/10 border border-primary-foreground/20">
            <p className="text-xs text-primary-foreground/60 mb-1">Activating account for</p>
            <p className="text-sm font-semibold text-primary-foreground">{vendorName}</p>
          </div>
        )}
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-4">
              <span className="text-primary-foreground font-bold text-sm font-display">IF</span>
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground">Set Your Password</h1>
          </div>

          <h2 className="text-2xl font-bold font-display text-foreground">Set Your Password</h2>
          <p className="text-muted-foreground mt-1 mb-8">
            Create a password to activate your vendor portal access.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={8}
                className={inputCls.replace(" pr-12", "")}
              />
            </div>

            {errorMessage && (
              <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-soft disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Activating…
                </>
              ) : (
                <>
                  Activate Account
                </>
              )}
            </button>
          </form>

          <p className="text-center text-caption mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
