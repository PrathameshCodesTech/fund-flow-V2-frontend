import { Navigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Mail } from "lucide-react";

export default function VendorRegistrationPage() {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();
  const org = (searchParams.get("org") ?? "").trim();

  if (token) {
    return <Navigate to={`/vendor/onboarding/${encodeURIComponent(token)}`} replace />;
  }

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Invitation Link Required</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Vendor onboarding now runs through the invitation-based form only. Use the onboarding
          link shared by the Hiparks team to open the full registration form.
        </p>
        {org ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Legacy org-only registration links are no longer supported. Ask the team to resend a
            fresh invitation for this organization.
          </p>
        ) : null}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          <Mail className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Expected format: <span className="font-medium text-foreground">/vendor/register?token=...</span>
            {" "}or the direct onboarding URL sent over email.
          </div>
        </div>
      </div>
    </div>
  );
}
