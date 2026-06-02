import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FinanceShell } from "@/components/v2/FinanceShell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { listSubmissions } from "@/lib/api/v2vendor";
import { SUBMISSION_STATUS_LABELS, type SubmissionStatus } from "@/lib/types/v2vendor";
import {
  Users,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  Mail,
  RefreshCw,
} from "lucide-react";

function fmtDate(val: string | null): string {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(val));
  } catch {
    return val;
  }
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const config: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    draft: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300", icon: Clock },
    submitted: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: Clock },
    sent_to_finance: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", icon: Clock },
    finance_approved: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
    finance_rejected: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", icon: XCircle },
    reopened: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", icon: RefreshCw },
    marketing_pending: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: Clock },
    marketing_approved: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
    activated: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
    rejected: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", icon: XCircle },
  };

  const defaultConfig = { bg: "bg-slate-100", text: "text-slate-700", icon: Clock };
  const cfg = config[status] ?? defaultConfig;
  const Icon = cfg.icon;
  const label = SUBMISSION_STATUS_LABELS[status] ?? status;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
        ${active
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
        }
      `}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count !== undefined && count > 0 && (
        <span className={`
          px-2 py-0.5 rounded-full text-xs font-semibold
          ${active ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}
        `}>
          {count}
        </span>
      )}
    </button>
  );
}

function VendorItem({
  submission,
  showAction,
  onClick,
}: {
  submission: {
    id: number | string;
    normalized_vendor_name: string | null;
    normalized_email: string | null;
    finance_sent_at: string | null;
    status: SubmissionStatus;
    finance_vendor_code?: string | null;
  };
  showAction: boolean;
  onClick: () => void;
}) {
  const initials = (submission.normalized_vendor_name ?? "UV")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      onClick={onClick}
      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/10 border border-violet-500/20">
          <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate text-foreground">
            {submission.normalized_vendor_name ?? "Unknown Vendor"}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              {submission.normalized_email ?? "No email"}
            </span>
            {submission.finance_vendor_code && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  SAP: {submission.finance_vendor_code}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
        <div className="flex flex-col items-start sm:items-end gap-1">
          <StatusBadge status={submission.status} />
          <span className="text-xs text-muted-foreground">{fmtDate(submission.finance_sent_at)}</span>
        </div>
        {showAction ? (
          <Button
            size="sm"
            className="shrink-0 gap-1.5 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            Review
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            View
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ type }: { type: "pending" | "completed" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={`rounded-full p-6 mb-4 ${type === "pending" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-muted"}`}>
        {type === "pending" ? (
          <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Users className="h-10 w-10 text-muted-foreground" />
        )}
      </div>
      <h3 className="font-semibold text-lg text-foreground mb-1">
        {type === "pending" ? "All caught up!" : "No completed reviews yet"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {type === "pending"
          ? "There are no pending vendor reviews at this time. New submissions will appear here."
          : "Completed reviews will appear here once you start reviewing submissions."}
      </p>
    </div>
  );
}

export default function FinanceVendorListPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");

  // Fetch pending submissions (sent_to_finance)
  const pendingQuery = useQuery({
    queryKey: ["finance", "vendor-submissions", "sent_to_finance"],
    queryFn: () => listSubmissions({ status: "sent_to_finance" }),
  });

  // Fetch completed submissions by finance decision history
  const completedQuery = useQuery({
    queryKey: ["finance", "vendor-submissions", "completed"],
    queryFn: () => listSubmissions({ finance_reviewed: true }),
    enabled: activeTab === "completed",
  });

  const pendingSubmissions = pendingQuery.data?.results ?? [];
  const completedSubmissions = completedQuery.data?.results ?? [];
  const currentSubmissions = activeTab === "pending" ? pendingSubmissions : completedSubmissions;
  const isLoading = activeTab === "pending" ? pendingQuery.isLoading : completedQuery.isLoading;

  return (
    <FinanceShell
      title="Vendor Reviews"
      breadcrumbs={[
        { label: "Finance", href: "/finance" },
        { label: "Vendor Reviews" },
      ]}
    >
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Vendor Reviews</h1>
              <p className="text-muted-foreground mt-1">
                Review and approve vendor onboarding submissions
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2">
            <TabButton
              active={activeTab === "pending"}
              onClick={() => setActiveTab("pending")}
              icon={Clock}
              label="Pending"
              count={pendingSubmissions.length}
            />
            <TabButton
              active={activeTab === "completed"}
              onClick={() => setActiveTab("completed")}
              icon={CheckCircle2}
              label="Completed"
            />
          </div>

          {/* Content */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/30">
              <h2 className="font-semibold text-foreground">
                {activeTab === "pending" ? "Pending Vendor Onboarding Reviews" : "Completed Reviews"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeTab === "pending"
                  ? `${pendingSubmissions.length} vendor${pendingSubmissions.length !== 1 ? "s" : ""} awaiting your review`
                  : `${completedSubmissions.length} vendor${completedSubmissions.length !== 1 ? "s" : ""} reviewed`}
              </p>
            </div>

            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading vendors...</p>
                  </div>
                </div>
              ) : currentSubmissions.length === 0 ? (
                <EmptyState type={activeTab} />
              ) : (
                <div className="space-y-2">
                  {currentSubmissions.map((submission) => (
                    <VendorItem
                      key={submission.id}
                      submission={submission}
                      showAction={activeTab === "pending"}
                      onClick={() => navigate(`/finance/vendors/${submission.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </FinanceShell>
  );
}
