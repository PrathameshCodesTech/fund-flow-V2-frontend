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
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-center items-center bg-primary">
        {/* Gradient depth overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/25 via-transparent to-white/10 pointer-events-none" />
        {/* Layered glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.28, 0.18] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-16 -left-16 w-80 h-80 rounded-full bg-white blur-3xl" />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.22, 0.12] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-0 -right-20 w-96 h-96 rounded-full bg-yellow-300 blur-3xl" />
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.18, 0.1] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-orange-200 blur-2xl" />
        </div>
        {/* Subtle dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)", backgroundSize: "28px 28px"}} />
        {/* Diagonal accent shapes */}
        <div className="absolute -top-10 -right-10 w-64 h-64 rotate-45 bg-white/5 rounded-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-10 w-72 h-72 rotate-12 bg-black/10 rounded-3xl pointer-events-none" />

        {/* Logo video — compact, centered */}
        <div className="relative z-10 flex flex-col items-center">
          <video
            src="/LoginScreen.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="h-[420px] w-[480px] object-contain drop-shadow-2xl"
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-4">
              <span className="text-primary-foreground font-bold text-xs font-display">VIMS</span>
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground">VIMS</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Vendor Invoice Management System</p>
          </div>

          <h2 className="text-2xl font-bold font-display text-foreground">Welcome back</h2>
          <p className="text-muted-foreground mt-1 mb-8">
            Sign in with your work email and password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                data-testid="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  data-testid="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm pr-12"
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

            {errorMessage && (
              <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              data-testid="login-submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-soft disabled:opacity-60 disabled:cursor-not-allowed"
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

          <p className="text-center text-caption mt-6">
            Enter your credentials to sign in
          </p>
        </motion.div>
      </div>
    </div>
  );
}
