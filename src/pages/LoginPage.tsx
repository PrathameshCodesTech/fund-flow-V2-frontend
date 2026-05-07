import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api/client";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      if (user.isVendorPortalUser) {
        navigate("/vendor-portal", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400 || err.status === 401) {
          setErrorMessage("Invalid email or password.");
        } else {
          setErrorMessage(err.message || "An unexpected error occurred.");
        }
      } else if (err instanceof TypeError) {
        setErrorMessage("Unable to connect to server. Please try again.");
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Top / Left panel */}
      <div className="flex flex-col lg:w-[52%] lg:shrink-0 bg-primary lg:bg-white">

        {/* Mobile-only: compact brand header */}
        <div className="flex flex-col items-center justify-center py-10 px-6 border-b border-white/15 lg:hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <img src="/vims-brand.png" alt="VIMS" className="h-8 w-auto object-contain" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">VIMS</h1>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
            Vendor Invoice Management System
          </p>
        </div>

        {/* Desktop-only: branding + video */}
        <div className="hidden lg:flex flex-col h-full">
          <div className="px-10 pt-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              Vendor Invoice Management System
            </p>
            <div className="flex items-center gap-2 mt-2">
              <img src="/vims-brand.png" alt="VIMS" className="h-12 w-auto object-contain" />
              <h1 className="text-4xl font-extrabold text-primary tracking-tight">VIMS</h1>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center px-10 pb-10">
            <div className="max-w-xl space-y-8">
              <div className="space-y-4">
                <h2 className="text-5xl font-extrabold text-primary leading-tight tracking-tight">
                  Streamline Your Invoice Management
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed font-medium">
                  Submit invoices, track approvals, and manage your vendor account — all in one intuitive platform.
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
                    <h3 className="font-semibold text-gray-900 mb-1">Automated Extraction</h3>
                    <p className="text-sm text-gray-600">Upload any invoice format — our smart system extracts details automatically for your review.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Real-Time Tracking</h3>
                    <p className="text-sm text-gray-600">Monitor approval status and receive instant notifications at every workflow stage.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Secure & Compliant</h3>
                    <p className="text-sm text-gray-600">Enterprise-grade security ensures your financial data stays protected and audit-ready.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom / Right panel — sign-in form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-primary">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <h2 className="text-2xl font-bold font-display text-white">Welcome back</h2>
          <p className="text-white/75 mt-1 mb-8">
            Sign in with your work email and password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-white/90 mb-1.5 block">Email</label>
              <input
                type="email"
                data-testid="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-white/25 bg-white/15 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/60 transition-all text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white/90 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  data-testid="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
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

            {errorMessage && (
              <div className="px-4 py-3 rounded-xl bg-black/20 border border-white/20 text-white text-sm">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              data-testid="login-submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-white text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/90 transition-opacity shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-white/50 text-xs mt-6">
            Enter your credentials to sign in
          </p>
        </motion.div>
      </div>
    </div>
  );
}
