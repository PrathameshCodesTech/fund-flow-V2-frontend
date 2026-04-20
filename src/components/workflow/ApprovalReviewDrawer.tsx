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
import { Input } from "@/components/ui/input";
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
  useSplitOptions,
  useSubmitSplit,
} from "@/lib/hooks/useV2Runtime";
import { ApiError } from "@/lib/api/client";
import type {
  TaskKind,
  ReviewGroup,
  ReviewTimelineEvent,
  AllowedSplitEntity,
  AllocationLine,
  AllocationContextLine,
} from "@/lib/types/v2runtime";
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
  Plus,
  Trash2,
  IndianRupee,
  Split,
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
  SPLIT_ALLOCATIONS_SUBMITTED: "Split allocations submitted",
  SPLIT_ALLOCATION_CORRECTED: "Split allocation corrected",
  ALLOCATION_BUDGET_RESERVED: "Budget reserved",
  ALLOCATION_BUDGET_RELEASED: "Budget released",
  ALLOCATION_BUDGET_CONSUMED: "Budget consumed",
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

// ── Branch allocation info ────────────────────────────────────────────────────

function BranchAllocationInfo({ alloc }: { alloc: AllocationContextLine }) {
  const ALLOC_STATUS_COLORS: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 border-gray-200",
    submitted: "bg-blue-100 text-blue-800 border-blue-200",
    branch_pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    correction_required: "bg-orange-100 text-orange-800 border-orange-200",
    cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <div className="mx-4 mt-3 mb-1 rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Split className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-xs font-semibold text-blue-800">Allocation Details</span>
        <Badge variant="outline" className={`text-[10px] ml-auto ${ALLOC_STATUS_COLORS[alloc.status] ?? ""}`}>
          {alloc.status.replace(/_/g, " ")}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
        <div>
          <p className="text-muted-foreground">Entity</p>
          <p className="font-medium">{alloc.entity_name ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Amount</p>
          <p className="font-semibold text-sm">
            ₹{parseFloat(alloc.amount).toLocaleString("en-IN")}
            {alloc.percentage && <span className="text-muted-foreground font-normal ml-1">({parseFloat(alloc.percentage).toFixed(1)}%)</span>}
          </p>
        </div>
        {alloc.category_name && (
          <div>
            <p className="text-muted-foreground">Category</p>
            <p className="font-medium">{alloc.category_name}</p>
          </div>
        )}
        {alloc.subcategory_name && (
          <div>
            <p className="text-muted-foreground">Subcategory</p>
            <p className="font-medium">{alloc.subcategory_name}</p>
          </div>
        )}
        {alloc.campaign_name && (
          <div>
            <p className="text-muted-foreground">Campaign</p>
            <p className="font-medium">{alloc.campaign_name}</p>
          </div>
        )}
        {alloc.selected_approver && (
          <div>
            <p className="text-muted-foreground">Approver</p>
            <p className="font-medium">{alloc.selected_approver.email}</p>
          </div>
        )}
      </div>
      {alloc.rejection_reason && (
        <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700 flex gap-2 items-start">
          <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{alloc.rejection_reason}</span>
        </div>
      )}
      {alloc.note && (
        <p className="text-[11px] italic text-muted-foreground border-l-2 border-blue-200 pl-2">{alloc.note}</p>
      )}
      <p className="text-[10px] text-muted-foreground">Revision #{alloc.revision_number}</p>
    </div>
  );
}

// ── Split allocation panel ────────────────────────────────────────────────────

interface SplitRow {
  entity_id: number | null;
  category_id: number | null;
  subcategory_id: number | null;
  campaign_id: number | null;
  budget_id: number | null;
  amount: string;
  approver_id: number | null;
  note: string;
}

function SplitAllocationPanel({
  instanceStepId,
  invoiceAmount,
  invoiceCurrency,
  onSuccess,
}: {
  instanceStepId: string;
  invoiceAmount: string;
  invoiceCurrency: string;
  onSuccess: () => void;
}) {
  const { data: splitOpts, isLoading: optsLoading, isError: optsError } = useSplitOptions(instanceStepId);
  const submitSplitMutation = useSubmitSplit();

  const [rows, setRows] = useState<SplitRow[]>([{ entity_id: null, category_id: null, subcategory_id: null, campaign_id: null, budget_id: null, amount: "", approver_id: null, note: "" }]);
  const [splitNote, setSplitNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const invoiceTotal = parseFloat(invoiceAmount);
  const allocatedTotal = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const balance = invoiceTotal - allocatedTotal;
  const isBalanced = Math.abs(balance) < 0.01;

  const allowedEntities: AllowedSplitEntity[] = splitOpts?.allowed_entities ?? [];
  const config = splitOpts?.step_config;
  const mustBalanceTotal = !config || config.allocation_total_policy === "MUST_EQUAL_INVOICE_TOTAL";

  const addRow = () => setRows((prev) => [...prev, { entity_id: null, category_id: null, subcategory_id: null, campaign_id: null, budget_id: null, amount: "", approver_id: null, note: "" }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<SplitRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const getEntityOptions = (rowIdx: number): AllowedSplitEntity[] => {
    if (config?.allow_multiple_lines_per_entity) return allowedEntities;
    const usedEntityIds = new Set(
      rows.filter((_, i) => i !== rowIdx && rows[i].entity_id != null).map((r) => r.entity_id)
    );
    return allowedEntities.filter((e) => !usedEntityIds.has(e.entity_id));
  };

  const getApproversForRow = (row: SplitRow): AllowedSplitEntity["eligible_approvers"] => {
    if (!row.entity_id) return [];
    const opt = allowedEntities.find((e) => e.entity_id === row.entity_id);
    return opt?.eligible_approvers ?? [];
  };

  const getBusinessUnitForRow = (row: SplitRow): AllowedSplitEntity | undefined => {
    if (!row.entity_id) return undefined;
    return allowedEntities.find((e) => e.entity_id === row.entity_id);
  };

  const updateBusinessUnit = (rowIdx: number, entityId: number | null) => {
    const opt = allowedEntities.find((e) => e.entity_id === entityId);
    updateRow(rowIdx, {
      entity_id: entityId,
      category_id: opt?.default_category_id ?? null,
      subcategory_id: opt?.default_subcategory_id ?? null,
      campaign_id: opt?.default_campaign_id ?? null,
      budget_id: opt?.default_budget_id ?? null,
      approver_id: opt?.eligible_approvers.length === 1 ? opt.eligible_approvers[0].id : null,
    });
  };

  const handleSubmit = async () => {
    setValidationError(null);
    if (rows.some((r) => !r.entity_id || !r.amount || !r.approver_id)) {
      setValidationError("All rows must have an entity, amount, and approver.");
      return;
    }
    if (config?.require_category && rows.some((r) => !r.category_id)) {
      setValidationError("Category is required for all rows.");
      return;
    }
    if (config?.require_subcategory && rows.some((r) => !r.subcategory_id)) {
      setValidationError("Subcategory is required for all rows.");
      return;
    }
    if (config?.require_campaign && rows.some((r) => !r.campaign_id)) {
      setValidationError("Campaign is required for all rows.");
      return;
    }
    if (config?.require_budget && rows.some((r) => !r.budget_id)) {
      setValidationError("Budget is required for all rows.");
      return;
    }
    if (mustBalanceTotal && !isBalanced) {
      setValidationError(`Total must equal invoice amount. Current balance: ₹${balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);
      return;
    }
    const allocations: AllocationLine[] = rows.map((r) => ({
      entity: r.entity_id!,
      category: r.category_id ?? undefined,
      subcategory: r.subcategory_id ?? undefined,
      campaign: r.campaign_id ?? undefined,
      budget: r.budget_id ?? undefined,
      amount: r.amount,
      selected_approver: r.approver_id!,
      note: r.note || undefined,
    }));
    try {
      await submitSplitMutation.mutateAsync({ instanceStepId, data: { allocations, note: splitNote || undefined } });
      onSuccess();
    } catch {
      // error shown via mutation.error
    }
  };

  if (optsLoading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (optsError || !splitOpts) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Failed to load split options. Refresh and try again.
        </div>
      </div>
    );
  }

  const submitError =
    submitSplitMutation.isError && submitSplitMutation.error instanceof ApiError
      ? submitSplitMutation.error.message
      : submitSplitMutation.isError
      ? "Failed to submit split."
      : null;

  return (
    <div className="p-4 space-y-4">
      {/* Existing allocations (correction context) */}
      {splitOpts.existing_allocations.length > 0 && (
        <div>
          <SectionLabel>Existing Allocations (Correction Mode)</SectionLabel>
          <div className="space-y-1.5">
            {splitOpts.existing_allocations.map((alloc) => (
              <div key={alloc.id} className={`rounded-lg border px-3 py-2 text-xs ${
                alloc.status === "correction_required" ? "border-orange-200 bg-orange-50" : "border-border bg-muted/20"
              }`}>
                <div className="flex items-center gap-2 justify-between">
                  <span className="font-medium">{alloc.entity_name}</span>
                  <span className="font-semibold">₹{parseFloat(alloc.amount).toLocaleString("en-IN")}</span>
                  <Badge variant="outline" className="text-[10px]">{alloc.status.replace(/_/g, " ")}</Badge>
                </div>
                {alloc.rejection_reason && (
                  <p className="mt-1 text-red-600 text-[11px]">{alloc.rejection_reason}</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Submitting will cancel the above allocations and create new branch tasks.
          </div>
        </div>
      )}

      {/* Total tracker */}
      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Invoice Total</span>
          <span className="font-semibold">{fmtAmount(invoiceAmount, invoiceCurrency)}</span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-muted-foreground">Allocated</span>
          <span className={`font-semibold ${isBalanced ? "text-green-600" : allocatedTotal > invoiceTotal ? "text-red-600" : "text-amber-600"}`}>
            {fmtAmount(allocatedTotal.toFixed(2), invoiceCurrency)}
          </span>
        </div>
        {!isBalanced && (
          <div className="flex items-center justify-between text-xs mt-1 border-t border-border pt-1">
            <span className="text-muted-foreground">Balance</span>
            <span className={`font-semibold ${balance > 0 ? "text-amber-600" : "text-red-600"}`}>
              {balance > 0 ? "-" : "+"}{fmtAmount(Math.abs(balance).toFixed(2), invoiceCurrency)}
            </span>
          </div>
        )}
      </div>

      {/* Allocation rows */}
      <div className="space-y-3">
        <SectionLabel>Allocation Lines</SectionLabel>
        {rows.map((row, idx) => {
          const entityOptions = getEntityOptions(idx);
          const approverOptions = getApproversForRow(row);
          const businessUnit = getBusinessUnitForRow(row);
          const categories = businessUnit?.categories ?? [];
          const subcategories = (businessUnit?.subcategories ?? []).filter(
            (s) => !row.category_id || s.category_id === row.category_id,
          );
          const campaigns = (businessUnit?.campaigns ?? []).filter(
            (c) =>
              (!row.category_id || c.category_id === row.category_id) &&
              (!row.subcategory_id || c.subcategory_id === row.subcategory_id),
          );
          const budgets = (businessUnit?.budgets ?? []).filter(
            (b) =>
              (!row.category_id || b.category_id === row.category_id) &&
              (!row.subcategory_id || b.subcategory_id === row.subcategory_id),
          );

          return (
            <div key={idx} className="rounded-lg border border-border bg-card p-3 space-y-2 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Line {idx + 1}</span>
                {rows.length > 1 && (
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeRow(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Business Unit select */}
              <div className="space-y-1">
                <Label className="text-[11px]">Business Unit *</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  value={row.entity_id ?? ""}
                  onChange={(e) => {
                    const eid = e.target.value ? Number(e.target.value) : null;
                    updateBusinessUnit(idx, eid);
                  }}
                >
                  <option value="">Select business unit...</option>
                  {entityOptions.map((e) => (
                    <option key={e.entity_id} value={e.entity_id}>
                      {e.business_unit_name ?? e.entity_name}
                    </option>
                  ))}
                </select>
              </div>

              {row.entity_id && (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Category {config?.require_category ? "*" : ""}</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      value={row.category_id ?? ""}
                      onChange={(e) =>
                        updateRow(idx, {
                          category_id: e.target.value ? Number(e.target.value) : null,
                          subcategory_id: null,
                          campaign_id: null,
                          budget_id: null,
                        })
                      }
                    >
                      <option value="">Select category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.code ? ` (${c.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Subcategory {config?.require_subcategory ? "*" : ""}</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      value={row.subcategory_id ?? ""}
                      onChange={(e) =>
                        updateRow(idx, {
                          subcategory_id: e.target.value ? Number(e.target.value) : null,
                          campaign_id: null,
                          budget_id: null,
                        })
                      }
                    >
                      <option value="">Select subcategory...</option>
                      {subcategories.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}{s.category_name ? ` (${s.category_name})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Campaign {config?.require_campaign ? "*" : ""}</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      value={row.campaign_id ?? ""}
                      onChange={(e) => {
                        const campaignId = e.target.value ? Number(e.target.value) : null;
                        const campaign = campaigns.find((c) => c.id === campaignId);
                        updateRow(idx, {
                          campaign_id: campaignId,
                          category_id: campaign?.category_id ?? row.category_id,
                          subcategory_id: campaign?.subcategory_id ?? row.subcategory_id,
                          budget_id: campaign?.budget_id ?? row.budget_id,
                        });
                      }}
                    >
                      <option value="">Select campaign...</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.approved_amount ? ` - ${fmtAmount(c.approved_amount, invoiceCurrency)}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Budget {config?.require_budget ? "*" : ""}</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      value={row.budget_id ?? ""}
                      onChange={(e) => {
                        const budgetId = e.target.value ? Number(e.target.value) : null;
                        const budget = budgets.find((b) => b.id === budgetId);
                        updateRow(idx, {
                          budget_id: budgetId,
                          category_id: budget?.category_id ?? row.category_id,
                          subcategory_id: budget?.subcategory_id ?? row.subcategory_id,
                        });
                      }}
                    >
                      <option value="">Select budget...</option>
                      {budgets.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.scope_node_name ? `${b.scope_node_name} - ` : ""}
                          {b.name}
                          {b.available_amount ? ` | Available ${fmtAmount(b.available_amount, b.currency ?? invoiceCurrency)}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-1">
                <Label className="text-[11px]">Amount (₹) *</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-7 h-8 text-xs"
                    placeholder="0.00"
                    value={row.amount}
                    onChange={(e) => updateRow(idx, { amount: e.target.value })}
                  />
                </div>
              </div>

              {/* Approver */}
              <div className="space-y-1">
                <Label className="text-[11px]">Approver *</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  value={row.approver_id ?? ""}
                  onChange={(e) => updateRow(idx, { approver_id: e.target.value ? Number(e.target.value) : null })}
                  disabled={!row.entity_id}
                >
                  <option value="">
                    {!row.entity_id ? "Select business unit first" : approverOptions.length === 0 ? "No eligible approvers" : "Select approver..."}
                  </option>
                  {approverOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Note */}
              <div className="space-y-1">
                <Label className="text-[11px]">Note (optional)</Label>
                <Input
                  className="h-7 text-xs"
                  placeholder="Add a note for this line..."
                  value={row.note}
                  onChange={(e) => updateRow(idx, { note: e.target.value })}
                />
              </div>

            </div>
          );
        })}

        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5 text-xs"
          onClick={addRow}
          disabled={!config?.allow_multiple_lines_per_entity && rows.length >= allowedEntities.length}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Line
        </Button>
      </div>

      {/* Split note */}
      <div className="space-y-1">
        <Label className="text-xs">Split Note (optional)</Label>
        <Textarea
          rows={2}
          className="text-xs resize-none"
          placeholder="Describe the rationale for this split..."
          value={splitNote}
          onChange={(e) => setSplitNote(e.target.value)}
        />
      </div>

      {(validationError || submitError) && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {validationError || submitError}
        </div>
      )}

      {isBalanced && (
        <div className="flex items-center gap-1.5 text-xs text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Total matches invoice amount.
        </div>
      )}

      <Button
        size="sm"
        className="w-full gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
        onClick={handleSubmit}
        disabled={submitSplitMutation.isPending || (mustBalanceTotal && !isBalanced) || rows.some((r) => !r.entity_id || !r.amount || !r.approver_id)}
      >
        {submitSplitMutation.isPending ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" />Submitting...</>
        ) : (
          <><Split className="h-3.5 w-3.5" />Submit Split for Entity Approval</>
        )}
      </Button>
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

        {/* Branch allocation info banner (for runtime split branches) */}
        {data?.branch_allocation && (
          <BranchAllocationInfo alloc={data.branch_allocation} />
        )}

        {/* Tabs content */}
        {!isError && (
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <ReviewSkeleton />
            ) : data ? (() => {
              const isRuntimeSplit = data.task.step_kind === "RUNTIME_SPLIT_ALLOCATION";
              const tabs = isRuntimeSplit
                ? ["split", "overview", "documents", "timeline", "workflow"]
                : ["overview", "documents", "timeline", "workflow"];

              return (
                <Tabs defaultValue={isRuntimeSplit ? "split" : "overview"} className="flex flex-col h-full">
                  <div className="shrink-0 border-b border-border">
                    <TabsList className="h-auto w-full rounded-none bg-transparent px-4 gap-0 justify-start">
                      {tabs.map((tab) => (
                        <TabsTrigger
                          key={tab}
                          value={tab}
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none capitalize text-xs py-2.5 px-3"
                        >
                          {tab === "split"
                            ? <span className="flex items-center gap-1"><Split className="h-3 w-3" />Split</span>
                            : tab === "documents"
                            ? `Docs${data.subject?.documents?.length ? ` (${data.subject.documents.length})` : ""}`
                            : tab === "timeline"
                            ? `Events${data.timeline?.length ? ` (${data.timeline.length})` : ""}`
                            : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {isRuntimeSplit && data.task.instance_step_id && invoice && (
                      <TabsContent value="split" className="m-0">
                        <SplitAllocationPanel
                          instanceStepId={data.task.instance_step_id}
                          invoiceAmount={invoice.amount}
                          invoiceCurrency={invoice.currency}
                          onSuccess={handleActionSuccess}
                        />
                      </TabsContent>
                    )}
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
              );
            })() : null}
          </div>
        )}

        <Separator />

        {/* Decision panel — shown for normal steps/branches; hidden for runtime split (split panel handles it) */}
        {data && taskKind && taskId && data.task.step_kind !== "RUNTIME_SPLIT_ALLOCATION" && (
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
