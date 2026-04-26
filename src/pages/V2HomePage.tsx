import { useNavigate } from "react-router-dom";
import { V2Shell } from "@/components/v2/V2Shell";
import { useOpsDashboard } from "@/lib/hooks/useV2Dashboard";
import { INVOICE_STATUS_LABELS } from "@/lib/types/v2invoice";
import { FINANCE_HANDOFF_STATUS_LABELS } from "@/lib/types/v2finance";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Landmark,
  Users,
  Megaphone,
  Wallet,
  ArrowRight,
  Clock,
  FileText,
  Inbox,
  BarChart3,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | string | undefined;
  sub?: string;
  icon: React.ElementType;
  to?: string;
  urgency?: "normal" | "warn" | "ok";
}

function KpiCard({ label, value, sub, icon: Icon, to, urgency = "normal" }: KpiCardProps) {
  const navigate = useNavigate();
  const urgencyClasses = {
    normal: "text-primary",
    warn: "text-amber-500 dark:text-amber-400",
    ok: "text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md",
        to && "cursor-pointer",
      )}
      onClick={to ? () => navigate(to) : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
          {value === undefined ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <p className={cn("text-2xl font-bold tabular-nums", urgencyClasses[urgency])}>
              {value}
            </p>
          )}
          {sub && value !== undefined && (
            <p className="mt-1 text-xs text-muted-foreground truncate">{sub}</p>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  icon?: React.ElementType;
  action?: { label: string; to: string };
}

function SectionHeader({ title, icon: Icon, action }: SectionHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {action && (
        <button
          onClick={() => navigate(action.to)}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {action.label} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  finance_approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  finance_rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  in_review: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  internally_approved: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  pending_workflow: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
};

function StatusBadge({ status }: { status: string }) {
  const label =
    FINANCE_HANDOFF_STATUS_LABELS[status as keyof typeof FINANCE_HANDOFF_STATUS_LABELS] ??
    INVOICE_STATUS_LABELS[status as keyof typeof INVOICE_STATUS_LABELS] ??
    status;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      STATUS_COLORS[status] ?? "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200",
    )}>
      {label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const V2HomePage = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useOpsDashboard();
  const kpis = data?.kpis;
  const queues = data?.attention_queues;
  const myWork = data?.my_work;
  const recent = data?.recent_activity;
  const lifecycle = data?.lifecycle_summary;

  return (
    <V2Shell
      title="Operations Dashboard"
      titleIcon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
      actions={
        <button
          onClick={() => navigate("/insights")}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Insights
        </button>
      }
    >
      <ScrollArea className="flex-1">
      <div className="w-full px-4 py-4 sm:px-6 sm:py-6 space-y-6">

        {/* ── KPI Strip ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
          <KpiCard
            label="Pending Tasks"
            value={kpis?.pending_task_count}
            sub="approval steps for you"
            icon={CheckCircle2}
            to="/tasks"
            urgency={kpis && kpis.pending_task_count > 0 ? "warn" : "ok"}
          />
          <KpiCard
            label="Awaiting Workflow"
            value={kpis?.pending_workflow_invoices}
            sub="need workflow attached"
            icon={GitBranch}
            to="/invoices"
            urgency={kpis && kpis.pending_workflow_invoices > 0 ? "warn" : "ok"}
          />
          <KpiCard
            label="In Review"
            value={kpis?.in_review_invoices}
            sub="active internal review"
            icon={Inbox}
            to="/invoices"
            urgency="normal"
          />
          <KpiCard
            label="Finance Pending"
            value={kpis?.finance_pending_invoices}
            sub="awaiting finance response"
            icon={Landmark}
            to="/invoices"
            urgency={kpis && kpis.finance_pending_invoices > 0 ? "warn" : "ok"}
          />
          <KpiCard
            label="Finance Handoffs"
            value={kpis?.unresolved_finance_handoffs}
            sub="pending or sent"
            icon={Landmark}
            to="/finance-handoffs"
            urgency={kpis && kpis.unresolved_finance_handoffs > 0 ? "warn" : "ok"}
          />
          <KpiCard
            label="Vendor Submissions"
            value={kpis?.vendor_submissions_pending}
            sub="awaiting marketing approval"
            icon={Users}
            to="/vendors"
            urgency={kpis && kpis.vendor_submissions_pending > 0 ? "warn" : "ok"}
          />
          <KpiCard
            label="Blocked Drafts"
            value={kpis?.blocked_draft_instances_count}
            sub="workflow drafts blocked"
            icon={AlertTriangle}
            to="/tasks"
            urgency={kpis && kpis.blocked_draft_instances_count > 0 ? "warn" : "ok"}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

          {/* ── Left column ───────────────────────────────────────────────── */}
          <div className="space-y-4 min-w-0 xl:col-span-2">

            {/* Needs Attention */}
            <div className="min-w-0 rounded-xl border border-border bg-card">
              <SectionHeader
                title="Needs Attention"
                icon={AlertTriangle}
              />
              <div className="p-4 space-y-2">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : !queues?.stuck_invoices?.length && !queues?.blocked_steps?.length ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 py-1">
                    <CheckCircle2 className="h-4 w-4" />
                    No outstanding items — all clear
                  </div>
                ) : (
                  <>
                    {queues?.stuck_invoices?.map((inv) => (
                      <button
                        key={`stuck-${inv.id}`}
                        onClick={() => navigate(`/invoices/${inv.id}/control-tower`)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20 px-3 py-2.5 text-left text-sm hover:bg-amber-100/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <div className="min-w-0">
                            <span className="font-medium truncate">{inv.title}</span>
                            <span className="ml-2 text-muted-foreground text-xs">
                              {inv.scope_node__name}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={inv.status} />
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                    {queues?.blocked_steps?.map((step) => (
                      <button
                        key={`blocked-${step.id}`}
                        onClick={() => navigate("/tasks")}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20 px-3 py-2.5 text-left text-sm hover:bg-amber-100/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <div className="min-w-0">
                            <span className="font-medium truncate">
                              {step.workflow_step__name}
                            </span>
                            <span className="ml-2 text-muted-foreground text-xs">
                              {step.instance_group__instance__subject_scope_node__name}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-amber-600">
                            {step.assignment_state === "NO_ELIGIBLE_USERS"
                              ? "No eligible users"
                              : "Assignment required"}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Lifecycle Summary */}
            <div className="min-w-0 rounded-xl border border-border bg-card">
              <SectionHeader
                title="Invoice Lifecycle"
                icon={FileText}
                action={{ label: "View all invoices", to: "/invoices" }}
              />
              <div className="p-4">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {lifecycle?.invoices_by_status?.map(({ status, count }) => (
                      <button
                        key={status}
                        onClick={() => navigate(`/invoices?status=${status}`)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <StatusBadge status={status} />
                        </div>
                        <span className="font-semibold tabular-nums">{count}</span>
                      </button>
                    ))}
                    {!lifecycle?.invoices_by_status?.length && (
                      <p className="text-sm text-muted-foreground py-2">No invoices found.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── Right column ───────────────────────────────────────────────── */}
          <div className="space-y-4 min-w-0">

            {/* My Pending Tasks */}
            <div className="min-w-0 rounded-xl border border-border bg-card">
              <SectionHeader
                title="My Tasks"
                icon={CheckCircle2}
                action={{ label: "All tasks", to: "/tasks" }}
              />
              <div className="divide-y divide-border">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : !myWork?.pending_tasks?.length ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No pending tasks for you.
                  </div>
                ) : (
                  myWork.pending_tasks.slice(0, 8).map((task) => (
                    <button
                      key={`${task.kind}-${task.id}`}
                      onClick={() => navigate("/tasks")}
                      className="flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors"
                    >
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.step_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {task.group_name} · {task.subject_scope_node}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Recent Finance Handoffs */}
            <div className="min-w-0 rounded-xl border border-border bg-card">
              <SectionHeader
                title="Recent Handoffs"
                icon={Landmark}
                action={{ label: "All handoffs", to: "/finance-handoffs" }}
              />
              <div className="divide-y divide-border">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : !recent?.finance_handoffs?.length ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No finance handoffs yet.
                  </div>
                ) : (
                  recent.finance_handoffs.slice(0, 6).map((h) => (
                    <button
                      key={h.id}
                      onClick={() => navigate("/finance-handoffs")}
                      className="flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors"
                    >
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
                        <Landmark className="h-3 w-3 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {h.subject_type} #{h.subject_id}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <StatusBadge status={h.status} />
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {formatDate(h.created_at)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Recent Vendor Submissions */}
            <div className="min-w-0 rounded-xl border border-border bg-card">
              <SectionHeader
                title="Recent Vendor Submissions"
                icon={Users}
                action={{ label: "All vendors", to: "/vendors" }}
              />
              <div className="divide-y divide-border">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : !recent?.vendor_submissions?.length ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No vendor submissions yet.
                  </div>
                ) : (
                  recent.vendor_submissions.slice(0, 6).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => navigate("/vendors")}
                      className="flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors"
                    >
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-950">
                        <Users className="h-3 w-3 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{v.vendor_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {v.scope_node__name}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {formatDate(v.created_at)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      </ScrollArea>
    </V2Shell>
  );
};

export default V2HomePage;
