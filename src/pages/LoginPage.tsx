import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api/client";
import { getMyVendor } from "@/lib/api/v2vendor";
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
      await login(email, password);
      try {
        await getMyVendor();
        navigate("/vendor-portal", { replace: true });
      } catch {
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
            Invoice and marketing fund governance from vendor bill to payment.
          </p>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-primary-foreground/50 text-sm">
            <div className="w-8 h-px bg-primary-foreground/30" />
            <span>Trusted by leading enterprise teams</span>
          </div>
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
              <span className="text-primary-foreground font-bold text-sm font-display">IF</span>
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground">InvoFlow</h1>
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
