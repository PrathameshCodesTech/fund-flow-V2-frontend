import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmPasswordReset, validatePasswordReset } from "@/lib/api/v2user";

export default function PasswordResetPage() {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateMutation = useMutation({
    mutationFn: () => validatePasswordReset(uid!, token!),
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : "This password reset link is invalid or has expired.");
    },
  });

  const resetMutation = useMutation({
    mutationFn: (newPassword: string) => confirmPasswordReset(uid!, token!, newPassword),
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update password. Please try again.");
    },
  });

  useEffect(() => {
    if (uid && token) {
      validateMutation.mutate();
    } else {
      setErrorMessage("This password reset link is incomplete.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, token]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    resetMutation.mutate(password);
  }

  if (validateMutation.isPending) {
    return (
      <CenteredShell>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Validating reset link...</p>
      </CenteredShell>
    );
  }

  if (validateMutation.isError || (!validateMutation.data && errorMessage && !success)) {
    return (
      <CenteredShell>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <LockKeyhole className="h-7 w-7 text-destructive" />
        </div>
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-bold text-foreground">Invalid Reset Link</h1>
          <p className="text-sm text-muted-foreground">
            {errorMessage || "This link may have expired or already been used."}
          </p>
        </div>
        <Button asChild className="w-full">
          <Link to="/login">Go to Login</Link>
        </Button>
      </CenteredShell>
    );
  }

  if (success) {
    return (
      <CenteredShell>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-bold text-foreground">Password Updated</h1>
          <p className="text-sm text-muted-foreground">Redirecting you to login...</p>
        </div>
        <Button asChild className="w-full">
          <Link to="/login">Go to Login</Link>
        </Button>
      </CenteredShell>
    );
  }

  const account = validateMutation.data;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col lg:flex-row">
        <section className="flex flex-1 flex-col justify-center px-6 py-10 lg:px-12">
          <div className="max-w-xl space-y-7">
            <div className="space-y-4">
              <img src="/hp.jpg" alt="Horizon Industrial Parks" className="h-14 w-auto object-contain" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Vendor Invoice Management System
              </p>
              <h1 className="text-4xl font-extrabold leading-tight text-primary sm:text-5xl">
                Set Your Password
              </h1>
              <p className="text-lg text-muted-foreground">
                Create a new password to access your VIMS account.
              </p>
            </div>
            {account && (
              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <p className="text-xs text-muted-foreground">Account</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{account.name || account.email}</p>
                <p className="text-sm text-muted-foreground">{account.email}</p>
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center bg-primary px-6 py-10 lg:px-12">
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Reset Password</h2>
              <p className="text-sm text-white/75">Use a secure password with at least 8 characters.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-white/90">New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                  className="border-white/25 bg-white/15 pr-11 text-white placeholder:text-white/45"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/90">Confirm Password</Label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
                className="border-white/25 bg-white/15 text-white placeholder:text-white/45"
                placeholder="Re-enter new password"
              />
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm text-white">
                {errorMessage}
              </div>
            )}

            <Button
              type="submit"
              disabled={resetMutation.isPending}
              className="w-full bg-white text-primary hover:bg-white/90"
            >
              {resetMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Update Password
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}

function CenteredShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        {children}
      </div>
    </div>
  );
}
