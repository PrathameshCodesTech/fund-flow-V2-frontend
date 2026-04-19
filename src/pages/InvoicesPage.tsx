import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { V2Shell } from "@/components/v2/V2Shell";
import {
  useInvoices,
  useCreateInvoice,
  useSubmitInvoice,
  useEligibleWorkflows,
  useAttachWorkflow,
} from "@/lib/hooks/useV2Invoice";
import { useOrganizations, useScopeNodes } from "@/lib/hooks/useScopeNodes";
import { ApiError } from "@/lib/api/client";
import type { CreateInvoiceRequest, InvoiceStatus, Invoice } from "@/lib/types/v2invoice";
import { INVOICE_STATUS_LABELS } from "@/lib/types/v2invoice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Play,
  FileText,
  Building2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ArrowRight,
  Inbox,
  Search,
  GitBranch,
} from "lucide-react";

// ── Status colors ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  pending_workflow: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  pending: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  in_review: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  internally_approved: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  finance_pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  finance_approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  finance_rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  paid: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge className={STATUS_COLORS[status] ?? ""} variant="outline">
      {INVOICE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ── Finance state helper ────────────────────────────────────────────────────────

function getFinanceState(status: InvoiceStatus): {
  label: string;
  description: string;
  isFinance: boolean;
} {
  switch (status) {
    case "finance_pending":
      return {
        label: "Awaiting Finance",
        description: "Sent to finance team for review and approval.",
        isFinance: true,
      };
    case "finance_approved":
      return {
        label: "Finance Approved",
        description: "Approved by finance. Ready for payment processing.",
        isFinance: true,
      };
    case "finance_rejected":
      return {
        label: "Finance Rejected",
        description: "Finance team has rejected this invoice.",
        isFinance: true,
      };
    case "internally_approved":
      return {
        label: "Pending Finance Review",
        description: "Internally approved. Awaiting finance team review.",
        isFinance: false,
      };
    case "in_review":
      return {
        label: "In Approval Flow",
        description: "Currently going through the internal approval workflow.",
        isFinance: false,
      };
    case "rejected":
      return {
        label: "Rejected",
        description: "This invoice has been rejected.",
        isFinance: false,
      };
    case "paid":
      return {
        label: "Paid",
        description: "Payment has been processed.",
        isFinance: false,
      };
    default:
      return {
        label: INVOICE_STATUS_LABELS[status],
        description: "",
        isFinance: false,
      };
  }
}

// ── Loading / Empty ─────────────────────────────────────────────────────────────

function PageLoading() {
  return (
    <div className="flex h-32 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

// ── Quick filter presets ────────────────────────────────────────────────────────

type QuickFilter = "all" | "active" | "finance" | "attention" | "paid";

const QUICK_FILTER_LABELS: Record<QuickFilter, string> = {
  all: "All",
  active: "Active",
  finance: "Finance",
  attention: "Needs Attention",
  paid: "Paid",
};

function matchesQuickFilter(status: InvoiceStatus, filter: QuickFilter): boolean {
  switch (filter) {
    case "active":
      return !["paid", "rejected"].includes(status);
    case "finance":
      return ["finance_pending", "finance_approved", "finance_rejected"].includes(status);
    case "attention":
      return ["pending", "in_review", "finance_pending", "internally_approved"].includes(status);
    case "paid":
      return status === "paid";
    default:
      return true;
  }
}

// ── Create Invoice Dialog ──────────────────────────────────────────────────────

function CreateInvoiceDialog({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: nodes = [] } = useScopeNodes(orgId ?? undefined);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateInvoiceRequest & { scope_node_id: string }>();

  const createInvoice = useCreateInvoice();

  const onSubmit = async (data: CreateInvoiceRequest) => {
    try {
      await createInvoice.mutateAsync({
        scope_node: data.scope_node,
        title: data.title,
        amount: data.amount,
        currency: data.currency ?? "INR",
      });
      onOpenChange(false);
      reset();
      toast.success("Invoice created.");
    } catch {
      // error surfaced via mutation
    }
  };

  const submitError =
    createInvoice.isError && createInvoice.error instanceof ApiError
      ? createInvoice.error.message
      : createInvoice.isError
      ? "Failed to create invoice"
      : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select defaultValue="" onValueChange={(v) => setValue("scope_node", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit..." />
              </SelectTrigger>
              <SelectContent>
                {nodes.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.scope_node && (
              <p className="text-xs text-destructive">Required</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Invoice Title</Label>
            <Input
              {...register("title", { required: "Required" })}
              placeholder="e.g. Invoice #101"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                {...register("amount", { required: "Required" })}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input {...register("currency")} defaultValue="INR" placeholder="INR" />
            </div>
          </div>

          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInvoice.isPending}>
              {createInvoice.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              Create Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Attach Workflow Modal ───────────────────────────────────────────────────────

function AttachWorkflowModal({
  invoice,
  nodeMap,
  open,
  onOpenChange,
  onSuccess,
}: {
  invoice: Invoice;
  nodeMap: Record<string, string>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const navigate = useNavigate();
  const { data: workflows = [], isLoading } = useEligibleWorkflows(open ? invoice.id : null);
  const attachWorkflow = useAttachWorkflow();
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAttach = async () => {
    if (!selectedVersionId) return;
    setError(null);
    try {
      const result = await attachWorkflow.mutateAsync({
        invoiceId: invoice.id,
        data: { template_version_id: selectedVersionId },
      });
      onOpenChange(false);
      onSuccess();
      // Navigate to the draft assignment page
      navigate(`/workflow-drafts/${result.workflow_instance.id}/assign`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to attach workflow.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setSelectedVersionId(null); setError(null); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Attach Workflow</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Invoice summary */}
          <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-medium">{invoice.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entity</span>
              <span className="font-medium">{nodeMap[invoice.scope_node] ?? invoice.scope_node ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">
                {invoice.currency} {parseFloat(invoice.amount).toLocaleString()}
              </span>
            </div>
            {invoice.po_number && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">PO Number</span>
                <span className="font-medium">{invoice.po_number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">
                {new Date(invoice.created_at).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Workflow version selection */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Select Workflow Version</p>
            {isLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading eligible workflows…
              </div>
            ) : workflows.length === 0 ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                No published invoice workflow versions found for this entity or its parent units.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {workflows.map((w) => (
                  <button
                    key={w.version_id}
                    onClick={() => setSelectedVersionId(w.version_id)}
                    className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-colors ${
                      selectedVersionId === w.version_id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{w.template_name}</span>
                      <span className="text-muted-foreground">v{w.version_number}</span>
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      {w.scope_node_name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleAttach}
              disabled={!selectedVersionId || attachWorkflow.isPending}
            >
              {attachWorkflow.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-4 w-4" />
              )}
              Attach &amp; Create Draft
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Invoice Card ───────────────────────────────────────────────────────────────

function InvoiceCard({
  invoice,
  isSelected,
  onClick,
  nodeMap,
}: {
  invoice: Invoice;
  isSelected: boolean;
  onClick: () => void;
  nodeMap: Record<string, string>;
}) {
  const financeState = getFinanceState(invoice.status);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border px-4 py-3 transition-all ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-accent"
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium truncate text-foreground">{invoice.title}</p>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="font-medium">
              {invoice.currency} {parseFloat(invoice.amount).toLocaleString()}
            </span>
            {invoice.scope_node && nodeMap[invoice.scope_node] && (
              <span className="flex items-center gap-1">
                <Building2 className="h-2.5 w-2.5" />
                {nodeMap[invoice.scope_node]}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap justify-end">
          {invoice.status === "pending_workflow" ? (
            <span className="inline-flex items-center gap-1 rounded bg-violet-100 px-2 py-1 text-xs text-violet-700 dark:bg-violet-900 dark:text-violet-300">
              <Clock className="h-2.5 w-2.5" />
              {invoice.workflow_instance_id ? "Assign" : "Attach"}
            </span>
          ) : ["draft", "pending"].includes(invoice.status) ? (
            <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs text-primary">
              <Play className="h-2.5 w-2.5" />
              Start
            </span>
          ) : financeState.isFinance ? (
            <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
              invoice.status === "finance_rejected"
                ? "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200"
                : invoice.status === "finance_approved"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
            }`}>
              {invoice.status === "finance_rejected" ? (
                <XCircle className="h-2.5 w-2.5" />
              ) : invoice.status === "finance_approved" ? (
                <CheckCircle2 className="h-2.5 w-2.5" />
              ) : (
                <Clock className="h-2.5 w-2.5" />
              )}
              {financeState.label}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

// ── Submit Draft Button ─────────────────────────────────────────────────────────

function SubmitDraftButton({
  invoiceId,
  onSuccess,
}: {
  invoiceId: string;
  onSuccess: () => void;
}) {
  const submitInvoice = useSubmitInvoice();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    try {
      await submitInvoice.mutateAsync(invoiceId);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit invoice.");
    }
  };

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        className="w-full gap-1.5"
        onClick={handleSubmit}
        disabled={submitInvoice.isPending}
      >
        {submitInvoice.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ArrowRight className="h-3.5 w-3.5" />
        )}
        Submit for Review
      </Button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

// ── Invoice Detail Panel ────────────────────────────────────────────────────────

function InvoiceDetailPanel({
  invoice,
  nodeMap,
  onAttachWorkflow,
}: {
  invoice: Invoice;
  nodeMap: Record<string, string>;
  onAttachWorkflow: () => void;
}) {
  const navigate = useNavigate();

  const financeState = getFinanceState(invoice.status);

  const isFinanceState = ["finance_pending", "finance_approved", "finance_rejected"].includes(invoice.status);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {invoice.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {invoice.currency} {parseFloat(invoice.amount).toLocaleString()}
            </p>
          </div>
        </div>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-5">
          {/* Key facts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="mb-1 flex items-center gap-1">
                <p className="text-xs text-muted-foreground">Unit</p>
              </div>
              <p className="text-sm font-medium">
                {nodeMap[invoice.scope_node] ?? invoice.scope_node ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
              <p className="text-sm font-medium">
                {new Date(invoice.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Finance state — prominent if relevant */}
          {isFinanceState && (
            <div className={`rounded-lg border px-4 py-3 ${
              invoice.status === "finance_rejected"
                ? "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950"
                : invoice.status === "finance_approved"
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950"
                : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {invoice.status === "finance_rejected" ? (
                  <XCircle className={`h-4 w-4 text-rose-600`} />
                ) : invoice.status === "finance_approved" ? (
                  <CheckCircle2 className={`h-4 w-4 text-emerald-600`} />
                ) : (
                  <Clock className={`h-4 w-4 text-amber-600`} />
                )}
                <p className={`text-sm font-semibold ${
                  invoice.status === "finance_rejected"
                    ? "text-rose-900 dark:text-rose-100"
                    : invoice.status === "finance_approved"
                    ? "text-emerald-900 dark:text-emerald-100"
                    : "text-amber-900 dark:text-amber-100"
                }`}>
                  {financeState.label}
                </p>
              </div>
              <p className={`text-xs ${
                invoice.status === "finance_rejected"
                  ? "text-rose-700 dark:text-rose-300"
                  : invoice.status === "finance_approved"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-amber-700 dark:text-amber-300"
              }`}>
                {financeState.description}
              </p>
            </div>
          )}

          {/* Internal approval context */}
          {invoice.status === "internally_approved" && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-800 dark:bg-teal-950">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="h-4 w-4 text-teal-600" />
                <p className="text-sm font-semibold text-teal-900 dark:text-teal-100">
                  Pending Finance Review
                </p>
              </div>
              <p className="text-xs text-teal-700 dark:text-teal-300">
                Internally approved. Awaiting finance team for final approval before payment.
              </p>
            </div>
          )}

          {/* In review context */}
          {invoice.status === "in_review" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  In Approval Flow
                </p>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                This invoice is going through the internal approval workflow. Check Approval Tasks for the current stage.
              </p>
            </div>
          )}

          {/* Rejected context */}
          {invoice.status === "rejected" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                  Rejected
                </p>
              </div>
              <p className="text-xs text-red-700 dark:text-red-300">
                This invoice was rejected during the approval flow.
              </p>
            </div>
          )}

          {/* Paid context */}
          {invoice.status === "paid" && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 dark:border-purple-800 dark:bg-purple-950">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-purple-600" />
                <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                  Paid
                </p>
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Payment has been processed for this invoice.
              </p>
            </div>
          )}

          {/* Pending workflow context */}
          {invoice.status === "pending_workflow" && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-800 dark:bg-violet-950">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-violet-600" />
                <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">
                  Pending Workflow Attachment
                </p>
              </div>
              <p className="text-xs text-violet-700 dark:text-violet-300">
                This invoice requires an explicit workflow to be attached before the approval process begins.
              </p>
              {invoice.selected_workflow_template_name && (
                <div className="mt-2 flex items-center gap-2 text-xs text-violet-700 dark:text-violet-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" />
                  <span>Attached: {invoice.selected_workflow_template_name} v{invoice.selected_workflow_version_number}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </p>
            {invoice.status === "pending_workflow" && invoice.workflow_instance_id ? (
              <Button
                size="sm"
                className="w-full gap-1.5"
                onClick={() => navigate(`/workflow-drafts/${invoice.workflow_instance_id}/assign`)}
              >
                <Play className="h-3.5 w-3.5" />
                Continue Assignment
              </Button>
            ) : invoice.status === "pending_workflow" ? (
              <Button
                size="sm"
                className="w-full gap-1.5"
                onClick={onAttachWorkflow}
              >
                <Play className="h-3.5 w-3.5" />
                Attach Workflow
              </Button>
            ) : invoice.status === "draft" ? (
              <SubmitDraftButton invoiceId={invoice.id} onSuccess={() => {}} />
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => navigate(`/invoices/${invoice.id}/control-tower`)}
              >
                <GitBranch className="h-3.5 w-3.5" />
                Control Tower
                <ArrowRight className="ml-auto h-3.5 w-3.5" />
              </Button>
            )}
            {invoice.status === "in_review" && (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => navigate("/tasks")}
              >
                <Inbox className="h-3.5 w-3.5" />
                View Approval Tasks
              </Button>
            )}
            {isFinanceState && (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => navigate("/finance-handoffs")}
              >
                View Finance Handoffs
              </Button>
            )}
          </div>

          {/* Metadata */}
          <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Last updated{" "}
              {new Date(invoice.updated_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              ID: {invoice.id}
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const InvoicesPage = () => {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [attachWorkflowOpen, setAttachWorkflowOpen] = useState(false);

  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();
  const { data: nodes = [], isLoading: nodesLoading } = useScopeNodes(
    selectedOrgId ?? undefined,
  );

  const params = {
    ...(selectedNodeId && selectedNodeId !== "__all__" ? { scope_node: selectedNodeId } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { data: invoices = [], isLoading: invoicesLoading, refetch } = useInvoices(
    Object.keys(params).length > 0 ? params : undefined,
  );

  const { data: allNodes = [] } = useScopeNodes();
  const nodeMap: Record<string, string> = {};
  allNodes.forEach((n) => { nodeMap[n.id] = n.name; });

  // Quick-filter the list client-side for quick filter presets
  const displayedInvoices =
    quickFilter === "all"
      ? invoices
      : invoices.filter((inv) => matchesQuickFilter(inv.status, quickFilter));

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  return (
    <V2Shell
      title="Invoices"
      titleIcon={<FileText className="h-5 w-5 text-muted-foreground" />}
      orgSelector={
        orgsLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Org</span>
            <Select
              value={selectedOrgId ?? ""}
              onValueChange={(v) => {
                setSelectedOrgId(v);
                setSelectedNodeId(null);
                setSelectedInvoiceId(null);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All organizations" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      }
      unitSelector={
        nodesLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Unit</span>
            <Select
              value={selectedNodeId ?? ""}
              onValueChange={(v) => {
                setSelectedNodeId(v);
                setSelectedInvoiceId(null);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All units</SelectItem>
                {nodes.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      }
      actions={
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)} disabled={!selectedOrgId}>
            <Plus className="h-3.5 w-3.5" />
            New Invoice
          </Button>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Left: list panel */}
        <aside className="flex w-[24rem] shrink-0 flex-col border-r border-border bg-background xl:w-[26rem]">
          {/* Quick filters */}
          <div className="border-b border-border px-3 py-2">
            <div className="flex items-center gap-1 flex-wrap">
              {(Object.entries(QUICK_FILTER_LABELS) as [QuickFilter, string][]).map(
                ([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setQuickFilter(key)}
                    className={`rounded-md px-2 py-1 text-xs transition-colors ${
                      quickFilter === key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Status filter */}
          <div className="border-b border-border px-3 py-2">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setSelectedInvoiceId(null); }}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="internally_approved">Internally Approved</SelectItem>
                <SelectItem value="finance_pending">Finance Pending</SelectItem>
                <SelectItem value="finance_approved">Finance Approved</SelectItem>
                <SelectItem value="finance_rejected">Finance Rejected</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Count */}
          {!invoicesLoading && (
            <div className="border-b border-border px-3 py-1.5">
              <span className="text-xs text-muted-foreground">
                {displayedInvoices.length} invoice{displayedInvoices.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* List */}
          <ScrollArea className="flex-1">
            {invoicesLoading ? (
              <PageLoading />
            ) : displayedInvoices.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground opacity-30" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {statusFilter !== "all" || quickFilter !== "all"
                      ? "No matching invoices"
                      : "No invoices yet"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {statusFilter !== "all" || quickFilter !== "all"
                      ? "Try different filters."
                      : "Create your first invoice to get started."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 p-2">
                {displayedInvoices.map((inv) => (
                  <InvoiceCard
                    key={inv.id}
                    invoice={inv}
                    isSelected={selectedInvoiceId === inv.id}
                    onClick={() => setSelectedInvoiceId(inv.id)}
                    nodeMap={nodeMap}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Right: detail panel */}
        <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-secondary/5">
          {selectedInvoice ? (
            <InvoiceDetailPanel
              invoice={selectedInvoice}
              nodeMap={nodeMap}
              onAttachWorkflow={() => setAttachWorkflowOpen(true)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Select an invoice
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose an invoice from the list to view its details and actions.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <CreateInvoiceDialog
        orgId={selectedOrgId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {selectedInvoice && (
        <AttachWorkflowModal
          invoice={selectedInvoice}
          nodeMap={nodeMap}
          open={attachWorkflowOpen}
          onOpenChange={setAttachWorkflowOpen}
          onSuccess={() => { refetch(); setSelectedInvoiceId(null); }}
        />
      )}
    </V2Shell>
  );
};

export default InvoicesPage;
