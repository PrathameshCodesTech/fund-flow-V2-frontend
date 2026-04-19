import { useNavigate, useParams } from "react-router-dom";
import { V2Shell } from "@/components/v2/V2Shell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInvoiceControlTower } from "@/lib/hooks/useV2Dashboard";
import { useResendFinanceHandoff } from "@/lib/hooks/useV2Finance";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/types/v2invoice";
import { FINANCE_HANDOFF_STATUS_LABELS, type FinanceHandoffStatus } from "@/lib/types/v2finance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  GitBranch,
  Circle,
  Users,
  Building2,
  CalendarDays,
  IndianRupee,
  FileText,
  Workflow,
  History,
  BadgeCheck,
  UserCheck,
  ArrowRightLeft,
  Unplug,
  Snowflake,
  OctagonAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtAmount(amount: string, currency: string) {
  const n = parseFloat(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

// ── Status maps ───────────────────────────────────────────────────────────────

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-stone-100 text-stone-700 border-stone-200",
  pending_workflow: "bg-violet-100 text-violet-800 border-violet-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_review: "bg-blue-100 text-blue-800 border-blue-200",
  internally_approved: "bg-indigo-100 text-indigo-800 border-indigo-200",
  finance_pending: "bg-cyan-100 text-cyan-800 border-cyan-200",
  finance_approved: "bg-green-100 text-green-800 border-green-200",
  finance_rejected: "bg-red-100 text-red-800 border-red-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const LIFECYCLE_PHASE_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_workflow: "Pending Workflow Attachment",
  awaiting_workflow_attachment: "Awaiting Workflow Attachment",
  draft_assignment: "Draft — Assignment Required",
  active_internal_workflow: "Active Internal Workflow",
  internally_approved: "Internally Approved",
  finance_pending: "Pending Finance Review",
  finance_approved: "Finance Approved",
  finance_rejected: "Finance Rejected",
};

const GROUP_STATUS_COLORS: Record<string, string> = {
  WAITING: "bg-stone-100 text-stone-600 border-stone-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  RESET: "bg-amber-100 text-amber-800 border-amber-200",
};

const STEP_ROW_COLORS: Record<string, string> = {
  WAITING: "border-stone-200 bg-stone-50/50 text-stone-600",
  IN_PROGRESS: "border-blue-200 bg-blue-50/70 text-blue-800",
  APPROVED: "border-green-200 bg-green-50/70 text-green-800",
  REJECTED: "border-red-200 bg-red-50/70 text-red-800",
  SKIPPED: "border-stone-200 bg-stone-50/30 text-stone-400 line-through",
  ORPHANED: "border-orange-200 bg-orange-50/50 text-orange-700",
  REASSIGNED: "border-purple-200 bg-purple-50/50 text-purple-800",
  WAITING_BRANCHES: "border-amber-200 bg-amber-50/50 text-amber-800",
};

const BRANCH_ROW_COLORS: Record<string, string> = {
  PENDING: "border-stone-200 bg-stone-50/50 text-stone-600",
  APPROVED: "border-green-200 bg-green-50/70 text-green-800",
  REJECTED: "border-red-200 bg-red-50/70 text-red-800",
};

const EVENT_DOT_COLORS: Record<string, string> = {
  STEP_APPROVED: "bg-green-500",
  BRANCH_APPROVED: "bg-green-500",
  INSTANCE_APPROVED: "bg-green-600",
  STEP_REJECTED: "bg-red-500",
  BRANCH_REJECTED: "bg-red-500",
  INSTANCE_REJECTED: "bg-red-600",
  STEP_REASSIGNED: "bg-purple-500",
  BRANCH_REASSIGNED: "bg-purple-500",
  STEP_ASSIGNED: "bg-blue-400",
  BRANCH_ASSIGNED: "bg-blue-400",
  BRANCHES_SPLIT: "bg-orange-400",
  BRANCHES_JOINED: "bg-teal-500",
  INSTANCE_STUCK: "bg-red-400",
  INSTANCE_FROZEN: "bg-slate-400",
};

const EVENT_LABELS: Record<string, string> = {
  STEP_ASSIGNED: "Step assigned",
  STEP_APPROVED: "Step approved",
  STEP_REJECTED: "Step rejected",
  STEP_REASSIGNED: "Step reassigned",
  STEP_ORPHANED: "Step orphaned",
  INSTANCE_STUCK: "Workflow stuck",
  INSTANCE_FROZEN: "Workflow frozen",
  INSTANCE_APPROVED: "Workflow approved",
  INSTANCE_REJECTED: "Workflow rejected",
  BRANCH_ASSIGNED: "Branch assigned",
  BRANCH_APPROVED: "Branch approved",
  BRANCH_REJECTED: "Branch rejected",
  BRANCH_REASSIGNED: "Branch reassigned",
  BRANCHES_SPLIT: "Branches split",
  BRANCHES_JOINED: "Branches joined",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", INVOICE_STATUS_COLORS[status] ?? "")}>
      {INVOICE_STATUS_LABELS[status as InvoiceStatus] ?? status}
    </Badge>
  );
}

function FinanceStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn(
      status === "finance_approved" ? "bg-green-100 text-green-800 border-green-200" :
      status === "finance_rejected" ? "bg-red-100 text-red-800 border-red-200" :
      status === "sent" ? "bg-blue-100 text-blue-800 border-blue-200" :
      "bg-amber-100 text-amber-800 border-amber-200"
    )}>
      {FINANCE_HANDOFF_STATUS_LABELS[status as FinanceHandoffStatus] ?? status}
    </Badge>
  );
}

function StepIcon({ status }: { status: string }) {
  if (status === "APPROVED") return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
  if (status === "REJECTED") return <XCircle className="h-4 w-4 text-red-600 shrink-0" />;
  if (status === "IN_PROGRESS") return <Clock className="h-4 w-4 text-blue-500 shrink-0 animate-pulse" />;
  if (status === "WAITING_BRANCHES") return <GitBranch className="h-4 w-4 text-amber-500 shrink-0" />;
  if (status === "ORPHANED") return <Unplug className="h-4 w-4 text-orange-500 shrink-0" />;
  return <Circle className="h-4 w-4 text-stone-400 shrink-0" />;
}

function SectionCard({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/20">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function EventMetaNotes({ metadata }: { metadata: Record<string, unknown> }) {
  const note = metadata?.note;
  const stepName = metadata?.step_name || metadata?.instance_step_id;
  const branchCount = metadata?.branch_count;

  if (!note && !stepName && !branchCount) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
      {note && (
        <span className="italic border-l-2 border-border pl-2">"{String(note)}"</span>
      )}
      {branchCount && (
        <span className="bg-muted px-1.5 py-0.5 rounded">
          {String(branchCount)} branches
        </span>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const InvoiceControlTowerPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useInvoiceControlTower(id ?? null);
  const resendHandoff = useResendFinanceHandoff();

  const handleResendFinanceHandoff = async () => {
    if (!data?.finance_handoff) return;
    try {
      await resendHandoff.mutateAsync(data.finance_handoff.id);
      toast.success("Finance handoff email resent successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend handoff email.");
    }
  };

  if (isLoading) {
    return (
      <V2Shell title="Invoice Control Tower" titleIcon={<Workflow className="h-5 w-5 text-muted-foreground" />}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </V2Shell>
    );
  }

  if (!data) {
    return (
      <V2Shell title="Invoice Control Tower" titleIcon={<Workflow className="h-5 w-5 text-muted-foreground" />}>
        <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
          Invoice not found.
        </div>
      </V2Shell>
    );
  }

  const {
    invoice, lifecycle_phase, workflow_template, workflow_version,
    active_instance, current_group, current_steps,
    workflow_groups, workflow_timeline, finance_handoff, blockers,
  } = data;

  const hasBlockers = blockers.length > 0;

  return (
    <V2Shell
      title="Invoice Control Tower"
      titleIcon={<Workflow className="h-5 w-5 text-muted-foreground" />}
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate("/invoices")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Invoices
        </Button>
      }
    >
      {/* ── Scrollable content area ── */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-6 space-y-5">

          {/* ── Hero Header Card ─────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            {/* Gradient bar */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 py-5">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h2 className="text-lg font-bold text-white truncate">{invoice.title}</h2>
                    <InvoiceStatusBadge status={invoice.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-blue-100">
                    {invoice.vendor_name && (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        Vendor: <strong className="text-white">{invoice.vendor_name}</strong>
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Entity: <strong className="text-white">{invoice.scope_node_name}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Created: <strong className="text-white">{formatDate(invoice.created_at)}</strong>
                    </span>
                    {invoice.po_number && (
                      <span className="text-blue-200 font-mono text-xs">
                        PO: {invoice.po_number}
                      </span>
                    )}
                  </div>
                </div>
                {/* Amount */}
                <div className="shrink-0 text-right">
                  <div className="flex items-center gap-1 text-white justify-end">
                    <IndianRupee className="h-5 w-5 opacity-80" />
                    <span className="text-3xl font-bold tabular-nums tracking-tight">
                      {parseFloat(invoice.amount).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5">{invoice.currency}</p>
                </div>
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-border border-t border-border">
              <div className="px-5 py-3">
                <MetaCell label="Invoice ID" value={<span className="font-mono">#{invoice.id}</span>} />
              </div>
              <div className="px-5 py-3">
                <MetaCell
                  label="Created by"
                  value={<span className="text-xs font-normal text-muted-foreground truncate">{invoice.created_by_email ?? "—"}</span>}
                />
              </div>
              <div className="px-5 py-3">
                <MetaCell label="Updated" value={timeAgo(invoice.updated_at)} />
              </div>
              <div className="px-5 py-3">
                <MetaCell
                  label="Lifecycle Phase"
                  value={
                    <span className="text-primary text-xs font-semibold">
                      {LIFECYCLE_PHASE_LABELS[lifecycle_phase] ?? lifecycle_phase}
                    </span>
                  }
                />
              </div>
            </div>

            {/* Workflow attachment strip */}
            {workflow_template && (
              <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-muted/10 text-sm">
                <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Attached workflow:</span>
                <span className="font-semibold">{workflow_template.name}</span>
                {workflow_version && (
                  <Badge variant="outline" className="text-xs">v{workflow_version.version_number}</Badge>
                )}
              </div>
            )}
          </div>

          {/* ── Current State + Blockers ──────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

            {/* Current State */}
            <div className="rounded-xl border border-border bg-card shadow-sm p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Current State
              </h3>

              {!active_instance ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  No active workflow instance on this invoice.
                </div>
              ) : lifecycle_phase === "pending_workflow" || lifecycle_phase === "awaiting_workflow_attachment" ? (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2.5 border border-amber-200">
                  <Clock className="h-4 w-4 shrink-0" />
                  Invoice is awaiting workflow attachment.
                </div>
              ) : (
                <div className="space-y-3">
                  {current_group && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn("font-medium", GROUP_STATUS_COLORS[current_group.status] ?? "")}>
                        {current_group.status.replace("_", " ")}
                      </Badge>
                      <span className="text-sm font-semibold">{current_group.name}</span>
                      {current_steps.map((step) => (
                        <div key={step.id} className="flex items-center gap-1.5 text-sm">
                          <StepIcon status={step.status} />
                          <span>{step.name}</span>
                          {step.assigned_user_email && (
                            <span className="text-muted-foreground text-xs">· {step.assigned_user_email}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {active_instance.started_at && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border/50 pt-2 mt-2">
                      <span>Started {timeAgo(active_instance.started_at)}</span>
                      <Separator orientation="vertical" className="h-3" />
                      <span>Status: <span className="font-semibold text-foreground">{active_instance.status}</span></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Blockers */}
            <div className={cn(
              "rounded-xl border p-5 shadow-sm",
              hasBlockers
                ? "border-red-200 bg-red-50/50"
                : "border-emerald-200 bg-emerald-50/40"
            )}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className={cn("h-4 w-4", hasBlockers ? "text-red-500" : "text-emerald-500")} />
                Blockers
              </h3>
              {!hasBlockers ? (
                <p className="text-sm text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  No blockers
                </p>
              ) : (
                <div className="space-y-2.5">
                  {blockers.map((b) => (
                    <div key={`${b.type}-${b.step_id}`} className="rounded-lg bg-white/80 border border-red-200 px-3 py-2">
                      <p className="text-xs font-semibold text-red-800">{b.step_name}</p>
                      <p className="text-[11px] text-red-600 mt-0.5">
                        {b.group_name} · {b.assignment_state === "NO_ELIGIBLE_USERS"
                          ? "No eligible users found"
                          : "Manual assignment required"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Workflow Progress ─────────────────────────────────── */}
          {workflow_groups.length > 0 && (
            <SectionCard title="Workflow Progress" icon={<Workflow className="h-4 w-4" />}>
              <div className="space-y-5">
                {workflow_groups.map((group, gi) => {
                  const isLast = gi === workflow_groups.length - 1;
                  return (
                    <div key={group.id}>
                      {/* Group row */}
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className={cn(
                          "flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-bold shrink-0",
                          group.status === "APPROVED" ? "bg-green-500 text-white" :
                          group.status === "REJECTED" ? "bg-red-500 text-white" :
                          group.status === "IN_PROGRESS" ? "bg-blue-500 text-white" :
                          "bg-stone-200 text-stone-600"
                        )}>
                          {gi + 1}
                        </div>
                        <span className="text-sm font-semibold">{group.name}</span>
                        <Badge variant="outline" className={cn("text-[10px]", GROUP_STATUS_COLORS[group.status] ?? "")}>
                          {group.status.replace("_", " ")}
                        </Badge>
                      </div>

                      {/* Steps */}
                      <div className={cn("ml-3 pl-4 space-y-2", !isLast && "border-l-2 border-dashed border-border pb-4")}>
                        {group.steps.map((step) => (
                          <div key={step.id}>
                            <div className={cn(
                              "flex items-center gap-2.5 rounded-lg border px-3 py-2",
                              STEP_ROW_COLORS[step.status] ?? "border-stone-200"
                            )}>
                              <StepIcon status={step.status} />
                              <span className="text-sm font-medium flex-1">{step.name}</span>
                              {step.assigned_user_email && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                                  <UserCheck className="h-3 w-3" />
                                  {step.assigned_user_email}
                                </span>
                              )}
                              {step.acted_at && (
                                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                                  {formatDateTime(step.acted_at)}
                                </span>
                              )}
                            </div>

                            {/* Branches */}
                            {step.branches.length > 0 && (
                              <div className="ml-6 mt-1.5 space-y-1.5">
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                                  <GitBranch className="h-3 w-3" />
                                  {step.branches.length} branch{step.branches.length > 1 ? "es" : ""}
                                </p>
                                {step.branches.map((branch) => (
                                  <div key={branch.id} className={cn(
                                    "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs",
                                    BRANCH_ROW_COLORS[branch.status] ?? "border-stone-200"
                                  )}>
                                    <GitBranch className="h-3 w-3 shrink-0 text-stone-400" />
                                    <span className="font-medium flex-1">{branch.target_scope_node_name ?? "Branch"}</span>
                                    {branch.assigned_user_email && (
                                      <span className="text-muted-foreground">{branch.assigned_user_email}</span>
                                    )}
                                    {branch.acted_at && (
                                      <span className="text-muted-foreground tabular-nums">
                                        {formatDateTime(branch.acted_at)}
                                      </span>
                                    )}
                                    <Badge variant="outline" className={cn("text-[9px] py-0 px-1.5", BRANCH_ROW_COLORS[branch.status] ?? "")}>
                                      {branch.status}
                                    </Badge>
                                  </div>
                                ))}
                                <p className="text-[11px] text-muted-foreground">
                                  {step.branches.filter(b => b.status === "APPROVED").length}/{step.branches.length} branches approved
                                </p>
                              </div>
                            )}

                            {step.note && (
                              <p className="text-xs text-muted-foreground italic ml-3 mt-1 border-l-2 border-border pl-2">
                                "{step.note}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* ── Finance Handoff ───────────────────────────────────── */}
          <SectionCard title="Finance Handoff" icon={<Send className="h-4 w-4" />}>
            {!finance_handoff ? (
              <p className="text-sm text-muted-foreground">
                No finance handoff has been created for this invoice yet.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <FinanceStatusBadge status={finance_handoff.status} />
                    {finance_handoff.recipient_count != null && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {finance_handoff.recipient_count} recipient{finance_handoff.recipient_count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {(finance_handoff.status === "pending" || finance_handoff.status === "sent") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResendFinanceHandoff}
                      disabled={resendHandoff.isPending}
                      className="gap-1.5 shrink-0"
                    >
                      {resendHandoff.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Resend Email
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-lg border border-border bg-muted/20 p-4">
                  {finance_handoff.finance_reference_id && (
                    <MetaCell label="Finance Ref" value={<span className="font-mono text-xs">{finance_handoff.finance_reference_id}</span>} />
                  )}
                  <MetaCell label="Sent at" value={formatDateTime(finance_handoff.sent_at)} />
                  <MetaCell label="Created" value={formatDate(finance_handoff.created_at)} />
                  <MetaCell label="Handoff ID" value={<span className="font-mono">#{finance_handoff.id}</span>} />
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── Event Timeline ────────────────────────────────────── */}
          {workflow_timeline.length > 0 && (
            <SectionCard title={`Event Timeline (${workflow_timeline.length})`} icon={<History className="h-4 w-4" />}>
              <div className="relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                <div className="space-y-4">
                  {workflow_timeline.map((event) => {
                    const dotColor = EVENT_DOT_COLORS[event.event_type] ?? "bg-stone-400";
                    return (
                      <div key={event.id} className="flex items-start gap-4 pl-7 relative">
                        <div className={cn("absolute left-0.5 top-1.5 h-3 w-3 rounded-full shrink-0 ring-2 ring-background", dotColor)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className="text-sm font-semibold leading-snug">
                              {EVENT_LABELS[event.event_type] ?? event.event_type.replace(/_/g, " ")}
                            </span>
                            {event.actor_email && (
                              <span className="text-xs text-muted-foreground">
                                by {event.actor_email}
                              </span>
                            )}
                            {event.target_email && event.target_email !== event.actor_email && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <ArrowRightLeft className="h-3 w-3" />
                                {event.target_email}
                              </span>
                            )}
                          </div>
                          <EventMetaNotes metadata={event.metadata as Record<string, unknown>} />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 tabular-nums pt-0.5">
                          {formatDateTime(event.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionCard>
          )}

          {/* bottom pad */}
          <div className="h-4" />
        </div>
      </ScrollArea>
    </V2Shell>
  );
};

export default InvoiceControlTowerPage;
