import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPicker } from "@/components/v2/UserPicker";
import {
  useTaskReview,
  useApproveStep,
  useRejectStep,
  useReassignStep,
  useApproveBranch,
  useRejectBranch,
  useReassignBranch,
} from "@/lib/hooks/useV2Runtime";
import { ApiError } from "@/lib/api/client";
import type { TaskKind, ReviewGroup, ReviewTimelineEvent } from "@/lib/types/v2runtime";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  FileText,
  AlertTriangle,
  Clock,
  Building2,
  GitBranch,
  ChevronRight,
  User,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtAmount(amount: string, currency: string) {
  const n = parseFloat(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 2,
  }).format(n);
}

function fmtAge(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_COLORS: Record<string, string> = {
  WAITING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  SKIPPED: "bg-gray-100 text-gray-500 border-gray-200",
  REASSIGNED: "bg-purple-100 text-purple-800 border-purple-200",
  ORPHANED: "bg-orange-100 text-orange-800 border-orange-200",
  STUCK: "bg-red-100 text-red-800 border-red-200",
  FROZEN: "bg-slate-100 text-slate-700 border-slate-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_workflow: "Pending Workflow",
  pending: "Pending",
  in_review: "In Review",
  internally_approved: "Internally Approved",
  finance_pending: "Finance Pending",
  finance_approved: "Finance Approved",
  finance_rejected: "Finance Rejected",
  rejected: "Rejected",
  paid: "Paid",
};

function InvoiceStatusBadge({ status }: { status: string }) {
  const color =
    status === "rejected" || status === "finance_rejected"
      ? "bg-red-100 text-red-800 border-red-200"
      : status === "paid" || status === "finance_approved"
      ? "bg-green-100 text-green-800 border-green-200"
      : status === "in_review" || status === "internally_approved"
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : "bg-yellow-100 text-yellow-800 border-yellow-200";

  return (
    <Badge variant="outline" className={`text-xs ${color}`}>
      {INVOICE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice_pdf: "Invoice PDF",
  invoice_excel: "Invoice Excel",
  po_copy: "PO Copy",
  delivery_challan: "Delivery Challan",
  tax_document: "Tax Document",
  supporting_document: "Supporting Document",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
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

const EVENT_COLORS: Record<string, string> = {
  STEP_APPROVED: "bg-green-500",
  BRANCH_APPROVED: "bg-green-500",
  INSTANCE_APPROVED: "bg-green-600",
  STEP_REJECTED: "bg-red-500",
  BRANCH_REJECTED: "bg-red-500",
  INSTANCE_REJECTED: "bg-red-600",
  STEP_REASSIGNED: "bg-purple-500",
  BRANCH_REASSIGNED: "bg-purple-500",
  STEP_ASSIGNED: "bg-blue-500",
  BRANCH_ASSIGNED: "bg-blue-500",
  BRANCHES_SPLIT: "bg-orange-400",
  BRANCHES_JOINED: "bg-teal-500",
  INSTANCE_STUCK: "bg-red-400",
  INSTANCE_FROZEN: "bg-slate-400",
};

// ── Section label ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

// ── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="shrink-0 text-xs text-muted-foreground w-36">{label}</span>
      <span className="text-xs text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ReviewSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ subject }: { subject: ReturnType<typeof useTaskReview>["data"] extends undefined ? never : ReturnType<typeof useTaskReview>["data"]["subject"] }) {
  const invoice = subject?.invoice;
  const vendor = subject?.vendor;

  if (subject?.missing) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Subject record could not be loaded.
      </div>
    );
  }

  if (subject?.type !== "invoice" || !invoice) {
    return (
      <div className="text-sm text-muted-foreground">
        Subject type <span className="font-mono">{subject?.type}</span> — no detailed view available.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Invoice summary */}
      <div>
        <SectionLabel>Invoice</SectionLabel>
        <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border">
          <div className="px-3">
            <DetailRow label="Reference" value={invoice.vendor_invoice_number || `#${invoice.id}`} />
            <DetailRow label="Status" value={<InvoiceStatusBadge status={invoice.status} />} />
            <DetailRow label="Invoice Date" value={fmtDate(invoice.invoice_date)} />
            <DetailRow label="Due Date" value={invoice.due_date ? (
              <span className={new Date(invoice.due_date) < new Date() ? "text-red-600 font-semibold" : ""}>
                {fmtDate(invoice.due_date)}
              </span>
            ) : "—"} />
            <DetailRow label="PO Number" value={invoice.po_number || "—"} />
            <DetailRow label="Entity" value={invoice.scope_node_name} />
            <DetailRow label="Submitted By" value={invoice.submitted_by?.email ?? "—"} />
            <DetailRow label="Created" value={fmtDateTime(invoice.created_at)} />
          </div>
        </div>
        {invoice.description && (
          <p className="mt-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            {invoice.description}
          </p>
        )}
      </div>

      {/* Vendor context */}
      {vendor ? (
        <div>
          <SectionLabel>Vendor</SectionLabel>
          <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border">
            <div className="px-3">
              <DetailRow label="Legal Name" value={vendor.vendor_name} />
              <DetailRow label="Email" value={vendor.email || "—"} />
              <DetailRow label="Phone" value={vendor.phone || "—"} />
              <DetailRow label="SAP Vendor ID" value={<span className="font-mono">{vendor.sap_vendor_id}</span>} />
              <DetailRow label="GSTIN" value={<span className="font-mono">{vendor.gstin || "—"}</span>} />
              <DetailRow label="PAN" value={<span className="font-mono">{vendor.pan || "—"}</span>} />
              <DetailRow label="Status" value={<StatusBadge status={vendor.operational_status.toUpperCase()} />} />
              {vendor.po_mandate_enabled && (
                <DetailRow label="PO Mandate" value={
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
                    Required
                  </Badge>
                } />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <SectionLabel>Vendor</SectionLabel>
          <p className="text-xs text-muted-foreground">No vendor linked to this invoice.</p>
        </div>
      )}
    </div>
  );
}

// ── Documents tab ─────────────────────────────────────────────────────────────

function DocumentsTab({ subject }: { subject: ReturnType<typeof useTaskReview>["data"] extends undefined ? never : ReturnType<typeof useTaskReview>["data"]["subject"] }) {
  const docs = subject?.documents ?? [];

  if (subject?.missing || subject?.type !== "invoice") {
    return <p className="text-sm text-muted-foreground">No documents available for this task type.</p>;
  }

  if (docs.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        No documents attached to this invoice. Approving without documents may be a compliance risk.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
        >
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{doc.file_name || "Untitled"}</p>
            <p className="text-[11px] text-muted-foreground">
              {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
              {" · "}
              <span className="uppercase">{doc.file_type}</span>
            </p>
          </div>
          {!doc.has_file && (
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 shrink-0">
              Missing
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Timeline tab ──────────────────────────────────────────────────────────────

function TimelineTab({ events }: { events: ReviewTimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No events recorded yet.</p>;
  }

  return (
    <div className="relative space-y-0">
      {events.map((ev, i) => {
        const dotColor = EVENT_COLORS[ev.event_type] ?? "bg-gray-400";
        const isLast = i === events.length - 1;
        return (
          <div key={ev.id} className="flex gap-3">
            {/* Rail */}
            <div className="flex flex-col items-center">
              <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${dotColor}`} />
              {!isLast && <div className="w-px flex-1 bg-border my-1" />}
            </div>
            {/* Content */}
            <div className="pb-4 min-w-0">
              <p className="text-xs font-medium leading-tight">
                {EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type}
              </p>
              {ev.actor && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  By {ev.actor.email}
                  {ev.target && ev.target.id !== ev.actor.id && ` → ${ev.target.email}`}
                </p>
              )}
              {ev.metadata && typeof ev.metadata === "object" && (ev.metadata as Record<string, unknown>).note && (
                <p className="mt-1 text-[11px] italic text-muted-foreground border-l-2 border-border pl-2">
                  "{String((ev.metadata as Record<string, unknown>).note)}"
                </p>
              )}
              <p className="mt-0.5 text-[10px] text-muted-foreground/70">{fmtDateTime(ev.created_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Workflow tab ──────────────────────────────────────────────────────────────

function WorkflowTab({ workflow }: { workflow: ReturnType<typeof useTaskReview>["data"] extends undefined ? never : ReturnType<typeof useTaskReview>["data"]["workflow"] }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border">
        <div className="px-3">
          <DetailRow label="Template" value={workflow.template_name} />
          <DetailRow label="Version" value={`v${workflow.template_version_number}`} />
          <DetailRow label="Instance" value={`#${workflow.instance_id}`} />
          <DetailRow label="Status" value={<StatusBadge status={workflow.instance_status} />} />
          <DetailRow label="Started" value={fmtDateTime(workflow.started_at)} />
          {workflow.completed_at && (
            <DetailRow label="Completed" value={fmtDateTime(workflow.completed_at)} />
          )}
          {workflow.current_group_name && (
            <DetailRow label="Current Stage" value={workflow.current_group_name} />
          )}
        </div>
      </div>

      <div>
        <SectionLabel>Stages</SectionLabel>
        <div className="space-y-2">
          {workflow.groups.map((group: ReviewGroup) => (
            <div
              key={group.id}
              className={`rounded-lg border px-3 py-2.5 ${
                group.status === "IN_PROGRESS"
                  ? "border-blue-200 bg-blue-50/50"
                  : group.status === "APPROVED"
                  ? "border-green-200 bg-green-50/30"
                  : group.status === "REJECTED"
                  ? "border-red-200 bg-red-50/30"
                  : "border-border bg-muted/10"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold">{group.display_order}. {group.name}</p>
                <StatusBadge status={group.status} />
              </div>
              <div className="space-y-1">
                {group.steps.map((step) => (
                  <div key={step.id} className={`rounded px-2 py-1 ${step.is_current_step ? "bg-blue-100/70" : ""}`}>
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="text-xs flex-1">{step.step_name}</span>
                      <StatusBadge status={step.status} />
                    </div>
                    {step.assigned_user && (
                      <p className="text-[11px] text-muted-foreground pl-5 mt-0.5 flex items-center gap-1">
                        <User className="h-2.5 w-2.5" />
                        {step.assigned_user.email}
                        {step.acted_at && ` · ${fmtDate(step.acted_at)}`}
                      </p>
                    )}
                    {step.note && (
                      <p className="text-[11px] text-muted-foreground pl-5 mt-0.5 italic">
                        "{step.note}"
                      </p>
                    )}
                    {/* Branches */}
                    {step.branches.length > 0 && (
                      <div className="ml-5 mt-1.5 space-y-1">
                        {step.branches.map((br) => (
                          <div
                            key={br.id}
                            className={`flex items-center gap-2 rounded px-2 py-1 text-[11px] border ${
                              br.is_current_branch
                                ? "border-blue-200 bg-blue-50"
                                : "border-border bg-muted/10"
                            }`}
                          >
                            <GitBranch className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                            <span className="flex-1">{br.target_scope_node_name}</span>
                            <StatusBadge status={br.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Decision panel ────────────────────────────────────────────────────────────

type ActionMode = "approve" | "reject" | "reassign" | null;

function DecisionPanel({
  taskKind,
  taskId,
  onSuccess,
}: {
  taskKind: "step" | "branch";
  taskId: string;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<ActionMode>(null);
  const [note, setNote] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const approveStep = useApproveStep();
  const rejectStep = useRejectStep();
  const reassignStep = useReassignStep();
  const approveBranch = useApproveBranch();
  const rejectBranch = useRejectBranch();
  const reassignBranch = useReassignBranch();

  const mutation =
    mode === "approve"
      ? taskKind === "step" ? approveStep : approveBranch
      : mode === "reject"
      ? taskKind === "step" ? rejectStep : rejectBranch
      : taskKind === "step" ? reassignStep : reassignBranch;

  const isPending = mutation.isPending;
  const errorMsg =
    mutation.isError && mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.isError
      ? "Action failed. Please try again."
      : null;

  const handleSubmit = async () => {
    if (!mode) return;
    if (mode === "reject" && !note.trim()) return;
    if (mode === "reassign" && !selectedUserId) return;

    try {
      if (mode === "approve") {
        if (taskKind === "step") {
          await (approveStep as ReturnType<typeof useApproveStep>).mutateAsync({
            id: taskId,
            data: note ? { note } : undefined,
          });
        } else {
          await (approveBranch as ReturnType<typeof useApproveBranch>).mutateAsync({
            id: taskId,
            data: note ? { note } : undefined,
          });
        }
      } else if (mode === "reject") {
        if (taskKind === "step") {
          await (rejectStep as ReturnType<typeof useRejectStep>).mutateAsync({
            id: taskId,
            data: { note },
          });
        } else {
          await (rejectBranch as ReturnType<typeof useRejectBranch>).mutateAsync({
            id: taskId,
            data: { note },
          });
        }
      } else if (mode === "reassign") {
        if (taskKind === "step") {
          await (reassignStep as ReturnType<typeof useReassignStep>).mutateAsync({
            id: taskId,
            data: { user_id: selectedUserId, note: note || undefined },
          });
        } else {
          await (reassignBranch as ReturnType<typeof useReassignBranch>).mutateAsync({
            id: taskId,
            data: { user_id: selectedUserId, note: note || undefined },
          });
        }
      }
      setMode(null);
      setNote("");
      setSelectedUserId("");
      onSuccess();
    } catch {
      // error shown via errorMsg
    }
  };

  const cancel = () => {
    setMode(null);
    setNote("");
    setSelectedUserId("");
    mutation.reset();
  };

  return (
    <div className="border-t border-border bg-background px-4 pt-3 pb-4 space-y-3">
      {mode === null ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
            onClick={() => setMode("approve")}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1 gap-1.5"
            onClick={() => setMode("reject")}
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={() => setMode("reassign")}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reassign
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold capitalize">{mode}</p>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={cancel}>
              Cancel
            </Button>
          </div>

          {mode === "reassign" && (
            <UserPicker
              value={selectedUserId || null}
              onChange={(id) => setSelectedUserId(id)}
              label="New Assignee *"
              placeholder="Search for a user..."
            />
          )}

          <div className="space-y-1">
            <Label className="text-xs">
              {mode === "reject" ? "Reason *" : mode === "approve" ? "Note (optional)" : "Note (optional)"}
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                mode === "reject"
                  ? "Explain why this is being rejected..."
                  : mode === "reassign"
                  ? "Reason for reassignment..."
                  : "Add a note..."
              }
              rows={3}
              className="text-sm resize-none"
            />
            {mode === "reject" && !note.trim() && (
              <p className="text-xs text-red-500">Rejection reason is required.</p>
            )}
          </div>

          {errorMsg && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
              {errorMsg}
            </p>
          )}

          <Button
            size="sm"
            className={`w-full gap-1.5 ${
              mode === "approve"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : mode === "reject"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }`}
            variant={mode === "reassign" ? "default" : undefined}
            onClick={handleSubmit}
            disabled={
              isPending ||
              (mode === "reject" && !note.trim()) ||
              (mode === "reassign" && !selectedUserId)
            }
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {mode === "approve" && <CheckCircle2 className="h-3.5 w-3.5" />}
                {mode === "reject" && <XCircle className="h-3.5 w-3.5" />}
                {mode === "reassign" && <RefreshCw className="h-3.5 w-3.5" />}
                Confirm {mode}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

interface ApprovalReviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskKind: TaskKind | null;
  taskId: string | null;
  /** called after a successful approve/reject/reassign */
  onActionSuccess: () => void;
}

export function ApprovalReviewDrawer({
  open,
  onOpenChange,
  taskKind,
  taskId,
  onActionSuccess,
}: ApprovalReviewDrawerProps) {
  const { data, isLoading, isError, error } = useTaskReview(taskKind, taskId);

  const invoice = data?.subject?.invoice;
  const vendor = data?.subject?.vendor;

  const handleActionSuccess = () => {
    onActionSuccess();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col p-0 w-full sm:max-w-2xl overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
          <SheetTitle className="sr-only">Approval task review</SheetTitle>
          <SheetDescription className="sr-only">
            Review invoice, vendor, documents, timeline, and workflow context before taking action.
          </SheetDescription>
          {isLoading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ) : data ? (
            <>
              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold truncate leading-snug">
                    {invoice?.title ?? data.task.step_name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {data.task.task_kind === "branch" && (
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 gap-1">
                        <GitBranch className="h-2.5 w-2.5" />
                        Branch
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{data.task.group_name}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{data.task.step_name}</span>
                    <StatusBadge status={data.task.status} />
                  </div>
                </div>
              </div>

              {/* Amount + Vendor hero */}
              {invoice && (
                <div className="mt-3 flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold tracking-tight">
                      {fmtAmount(invoice.amount, invoice.currency)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <InvoiceStatusBadge status={invoice.status} />
                      <span className="text-[11px] text-muted-foreground">{fmtAge(invoice.created_at)}</span>
                    </div>
                  </div>
                  {vendor && (
                    <div className="ml-auto text-right">
                      <div className="flex items-center gap-1.5 justify-end text-xs font-medium">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {vendor.vendor_name}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {invoice.scope_node_name}
                        {invoice.po_number && ` · PO: ${invoice.po_number}`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Assigned to */}
              {data.task.assigned_user && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <User className="h-3 w-3" />
                  Assigned to {data.task.assigned_user.email}
                  {data.task.task_kind === "branch" && data.task.target_scope_node_name && (
                    <span className="ml-1 flex items-center gap-1 text-blue-600">
                      <Clock className="h-3 w-3" />
                      {data.task.target_scope_node_name}
                    </span>
                  )}
                </div>
              )}
            </>
          ) : null}
        </SheetHeader>

        {/* Error state */}
        {isError && (
          <div className="p-4">
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error instanceof ApiError ? error.message : "Failed to load review data."}
            </div>
          </div>
        )}

        {/* Tabs content */}
        {!isError && (
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <ReviewSkeleton />
            ) : data ? (
              <Tabs defaultValue="overview" className="flex flex-col h-full">
                <div className="shrink-0 border-b border-border">
                  <TabsList className="h-auto w-full rounded-none bg-transparent px-4 gap-0 justify-start">
                    {["overview", "documents", "timeline", "workflow"].map((tab) => (
                      <TabsTrigger
                        key={tab}
                        value={tab}
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none capitalize text-xs py-2.5 px-3"
                      >
                        {tab === "documents"
                          ? `Documents${data.subject?.documents?.length ? ` (${data.subject.documents.length})` : ""}`
                          : tab === "timeline"
                          ? `Timeline${data.timeline?.length ? ` (${data.timeline.length})` : ""}`
                          : tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <TabsContent value="overview" className="p-4 m-0">
                    <OverviewTab subject={data.subject} />
                  </TabsContent>
                  <TabsContent value="documents" className="p-4 m-0">
                    <DocumentsTab subject={data.subject} />
                  </TabsContent>
                  <TabsContent value="timeline" className="p-4 m-0">
                    <TimelineTab events={data.timeline} />
                  </TabsContent>
                  <TabsContent value="workflow" className="p-4 m-0">
                    <WorkflowTab workflow={data.workflow} />
                  </TabsContent>
                </div>
              </Tabs>
            ) : null}
          </div>
        )}

        <Separator />

        {/* Decision panel — always shown when data loaded */}
        {data && taskKind && taskId && (
          <DecisionPanel
            taskKind={taskKind}
            taskId={taskId}
            onSuccess={handleActionSuccess}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
