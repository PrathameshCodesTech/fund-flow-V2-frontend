import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api/client";
import { setEmbedSession } from "@/lib/auth/session";

export default function EmbedLoginPage() {
  const { embedLogin, isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const email = useMemo(() => (searchParams.get("email") ?? "").trim().toLowerCase(), [searchParams]);

  useEffect(() => {
    if (isAuthenticated) {
      setEmbedSession(true);
      navigate(user?.isVendorPortalUser ? "/vendor-portal" : "/", { replace: true });
      return;
    }

    if (!email) {
      setErrorMessage("Missing email in embed login request.");
      return;
    }

    let cancelled = false;

    embedLogin(email)
      .then((loggedInUser) => {
        if (cancelled) return;
        setEmbedSession(true);
        navigate(loggedInUser.isVendorPortalUser ? "/vendor-portal" : "/", { replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setErrorMessage(err.message || "Unable to open the embedded session.");
          return;
        }
        if (err instanceof TypeError) {
          setErrorMessage("Unable to connect to server. Please try again.");
          return;
        }
        setErrorMessage("Unable to open the embedded session.");
      });

    return () => {
      cancelled = true;
    };
  }, [email, embedLogin, isAuthenticated, navigate, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <h1 className="text-base font-semibold text-foreground">Opening Horizon Industrial Parks</h1>
            <p className="text-sm text-muted-foreground">Starting your embedded session.</p>
          </div>
        </div>
        {errorMessage ? (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
