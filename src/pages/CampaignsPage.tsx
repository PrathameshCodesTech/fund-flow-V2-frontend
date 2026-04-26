import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { V2Shell } from "@/components/v2/V2Shell";
import {
  useCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useSubmitBudget,
  useReviewBudgetVariance,
  useCancelCampaign,
  useCampaignDocuments,
  useCreateCampaignDocument,
  useDeleteCampaignDocument,
  useCreateWorkflowFromCampaign,
} from "@/lib/hooks/useV2Campaign";
import { useOrganizations, useScopeNodes } from "@/lib/hooks/useScopeNodes";
import type {
  Campaign,
  CampaignStatus,
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from "@/lib/types/v2campaign";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/types/v2campaign";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Megaphone,
  ChevronRight,
  Calendar,
  FileText,
  Plus,
  X,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Play,
  Upload,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDecimal(v: string | null | undefined): number {
  if (!v) return 0;
  return parseFloat(v) || 0;
}

function formatBudget(v: string | null | undefined, currency = "INR"): string {
  const amount = parseDecimal(v);
  if (amount === 0) return "—";
  if (currency === "INR") {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${amount.toLocaleString("en-IN")}`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pending_budget: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  budget_variance_pending: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  pending_workflow: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  in_review: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  internally_approved: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  finance_pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  finance_approved: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  finance_rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  cancelled: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
};

function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge className={STATUS_COLORS[status] ?? ""} variant="outline">
      {CAMPAIGN_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function generalApiError(err: unknown): string | null {
  if (err instanceof ApiError) {
    return (
      err.errors["detail"]?.[0] ??
      err.errors["non_field_errors"]?.[0] ??
      err.message ??
      null
    );
  }
  if (err instanceof Error) return err.message;
  return null;
}

// ── Campaign Form Dialog ───────────────────────────────────────────────────────

interface CampaignFormProps {
  initial?: Partial<Campaign>;
  orgId: string | null;
  scopeNodeId?: string | null;
  onSubmit: (data: CreateCampaignRequest | UpdateCampaignRequest) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  error: unknown;
  submitLabel: string;
  mode: "create" | "edit";
}

function CampaignFormDialog({
  initial,
  orgId,
  scopeNodeId,
  onSubmit,
  onCancel,
  isSaving,
  error,
  submitLabel,
  mode,
}: CampaignFormProps) {
  const [open, setOpen] = useState(false);
  const [selectedScopeNode, setSelectedScopeNode] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");

  const { data: scopeNodes = [] } = useScopeNodes(orgId ?? undefined);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateCampaignRequest>({
    defaultValues: {
      org: orgId ?? "",
      scope_node: scopeNodeId ?? "",
      name: initial?.name ?? "",
      code: initial?.code ?? "",
      description: initial?.description ?? "",
      campaign_type: initial?.campaign_type ?? "",
      start_date: initial?.start_date ?? "",
      end_date: initial?.end_date ?? "",
      requested_amount: initial?.requested_amount ?? "",
      currency: initial?.currency ?? "INR",
      category: initial?.category ?? "",
      subcategory: initial?.subcategory ?? "",
      budget: initial?.budget ?? "",
    },
  });

  const submitError =
    error instanceof ApiError ? error.message : error ? "Something went wrong" : null;

  const handleOpenChange = (v: boolean) => {
    if (!v) { setOpen(false); onCancel(); }
    else {
      setSelectedScopeNode(initial?.scope_node ?? scopeNodeId ?? "");
      setSelectedCategory(initial?.category ?? "");
      setSelectedSubcategory(initial?.subcategory ?? "");
      reset({
        ...(initial ?? {}),
        org: orgId ?? "",
        scope_node: initial?.scope_node ?? scopeNodeId ?? "",
        category: initial?.category ?? "",
        subcategory: initial?.subcategory ?? "",
        budget: initial?.budget ?? "",
      });
      setOpen(true);
    }
  };

  // Keep scope_node in sync with selector
  useEffect(() => {
    setValue("scope_node", selectedScopeNode);
  }, [selectedScopeNode, setValue]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        ) : (
          <Button variant="ghost" size="icon" title="Edit campaign">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Campaign" : "Edit Campaign"}
          </DialogTitle>
        </DialogHeader>
        <form
          id={`campaign-form-${mode}`}
          onSubmit={handleSubmit(onSubmit as (data: CreateCampaignRequest) => Promise<void>)}
          className="space-y-4"
        >
          {/* Scope node — selector (Fix #5) */}
          <div className="space-y-1.5">
            <Label>Scope Node *</Label>
            <Select
                value={selectedScopeNode || undefined}
                onValueChange={setSelectedScopeNode}
              >
                <SelectTrigger className={errors.scope_node ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select scope node" />
                </SelectTrigger>
                <SelectContent>
                  {scopeNodes.length === 0 && (
                    <SelectItem value="no-nodes" disabled>No nodes available</SelectItem>
                  )}
                  {scopeNodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.name} ({node.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            {errors.scope_node && (
              <p className="text-xs text-destructive">{String(errors.scope_node.message)}</p>
            )}
            {/* Hidden field to submit the value */}
            <input type="hidden" {...register("scope_node", { required: "Required" })} value={selectedScopeNode} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register("name", { required: "Required" })}
                placeholder="Campaign name"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{String(errors.name.message)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                {...register("code", { required: "Required" })}
                placeholder="e.g. camp-001"
                className={errors.code ? "border-destructive" : ""}
              />
              {errors.code && (
                <p className="text-xs text-destructive">{String(errors.code.message)}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              {...register("description")}
              placeholder="Brief description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="campaign_type">Type</Label>
              <Select
                value={initial?.campaign_type ?? undefined}
                onValueChange={(v) => setValue("campaign_type", v)}
              >
                <SelectTrigger id="campaign_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {["Marketing", "Product Launch", "Event", "Brand Awareness", "Digital", "Print / Outdoor", "ESG", "Other"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={initial?.currency ?? undefined}
                onValueChange={(v) => setValue("currency", v)}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fix #1: category, subcategory, budget fields */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                {...register("category")}
                placeholder="category id"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                {...register("subcategory")}
                placeholder="subcategory id"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                {...register("budget")}
                placeholder="budget id"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Start Date</Label>
              <Input id="start_date" type="date" {...register("start_date")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">End Date</Label>
              <Input id="end_date" type="date" {...register("end_date")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="requested_amount">Requested Amount *</Label>
            <Input
              id="requested_amount"
              type="number"
              step="0.01"
              min="0"
              {...register("requested_amount", { required: "Required" })}
              placeholder="0.00"
              className={errors.requested_amount ? "border-destructive" : ""}
            />
            {errors.requested_amount && (
              <p className="text-xs text-destructive">{String(errors.requested_amount.message)}</p>
            )}
          </div>

          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); onCancel(); }}>
            Cancel
          </Button>
          <Button type="submit" form={`campaign-form-${mode}`} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Campaign Dialog ─────────────────────────────────────────────────────

function DeleteCampaignDialog({
  campaign,
  onClose,
  isDeleting,
  error,
  onConfirm,
}: {
  campaign: Campaign;
  onClose: () => void;
  isDeleting: boolean;
  error: unknown;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); onClose(); } }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Delete campaign" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Campaign</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{campaign.name}</strong>? This action cannot be undone.
        </p>
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error instanceof ApiError ? error.message : "Failed to delete"}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); onClose(); }}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Deleting...</> : "Delete Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Submit Budget Dialog ───────────────────────────────────────────────────────

function SubmitBudgetDialog({ campaign }: { campaign: Campaign }) {
  const [open, setOpen] = useState(false);
  const submitBudget = useSubmitBudget();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Send className="h-4 w-4" />
          Submit Budget
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Budget for Review</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Submit <strong>{campaign.name}</strong> for budget review? The backend will evaluate the campaign budget and transition the status accordingly.
        </p>
        {submitBudget.isError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitBudget.error instanceof ApiError ? submitBudget.error.message : "Failed to submit"}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => submitBudget.mutateAsync(campaign.id).then(() => setOpen(false))}
            disabled={submitBudget.isPending}
          >
            {submitBudget.isPending ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="mr-1.5 h-4 w-4" /> Submit</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Review Variance Dialog ─────────────────────────────────────────────────────

function ReviewVarianceDialog({ campaign }: { campaign: Campaign }) {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [note, setNote] = useState("");
  const reviewVariance = useReviewBudgetVariance();

  const handleSubmit = async () => {
    await reviewVariance.mutateAsync({
      id: campaign.id,
      data: { decision, review_note: note || undefined },
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <CheckCircle className="h-4 w-4" />
          Review Variance
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Budget Variance</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Review variance for <strong>{campaign.name}</strong>. Approved amounts will be updated.
          </p>
          <div className="space-y-1.5">
            <Label>Decision *</Label>
            <Select value={decision} onValueChange={(v) => setDecision(v as "approved" | "rejected")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approve</SelectItem>
                <SelectItem value="rejected">Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review_note">Review Note</Label>
            <Input
              id="review_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional review note..."
            />
          </div>
          {reviewVariance.isError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {reviewVariance.error instanceof ApiError ? reviewVariance.error.message : "Failed to review"}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={reviewVariance.isPending}>
            {reviewVariance.isPending ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Submitting...</>
            ) : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Start Workflow Dialog ───────────────────────────────────────────────────────

function StartWorkflowDialog({ campaign }: { campaign: Campaign }) {
  const [open, setOpen] = useState(false);
  const [activate, setActivate] = useState(false);
  const createWorkflow = useCreateWorkflowFromCampaign();
  const navigate = useNavigate();

  const handleStart = async () => {
    const result = await createWorkflow.mutateAsync({
      campaign_id: campaign.id,
      activate,
    }) as { id?: string };
    setOpen(false);
    if (result?.id) {
      navigate(`/workflow-drafts/${result.id}/assign`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Play className="h-4 w-4" />
          Start Workflow
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Workflow</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create a workflow instance from <strong>{campaign.name}</strong>?
          </p>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activate-wf"
              checked={activate}
              onChange={(e) => setActivate(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="activate-wf" className="text-sm font-normal">
              Activate immediately
            </Label>
          </div>
          {createWorkflow.isError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {createWorkflow.error instanceof ApiError ? createWorkflow.error.message : "Failed to start workflow"}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleStart} disabled={createWorkflow.isPending}>
            {createWorkflow.isPending ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Starting...</>
            ) : <><Play className="mr-1.5 h-4 w-4" /> Start Workflow</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Cancel Campaign Dialog ─────────────────────────────────────────────────────

function CancelCampaignDialog({ campaign }: { campaign: Campaign }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const cancelCampaign = useCancelCampaign();

  const handleCancel = async () => {
    await cancelCampaign.mutateAsync({ id: campaign.id, data: { note: note || undefined } });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground hover:text-destructive">
          <XCircle className="h-4 w-4" />
          Cancel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cancel <strong>{campaign.name}</strong>? This cannot be undone.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-note">Cancellation Note</Label>
            <Input
              id="cancel-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note..."
            />
          </div>
          {cancelCampaign.isError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {cancelCampaign.error instanceof ApiError ? cancelCampaign.error.message : "Failed to cancel"}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Keep Campaign</Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelCampaign.isPending}
          >
            {cancelCampaign.isPending ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Cancelling...</>
            ) : "Cancel Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Document Dialog ───────────────────────────────────────────────────────

function AddDocumentDialog({ campaign }: { campaign: Campaign }) {
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState("");
  const createDoc = useCreateCampaignDocument();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ title: string; file_url: string }>();

  const onSubmit = async (data: { title: string; file_url: string }) => {
    await createDoc.mutateAsync({ campaign: campaign.id, ...data, document_type: docType });
    setOpen(false);
    setDocType("");
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setDocType(""); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Upload className="h-4 w-4" />
          Add Document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Document</DialogTitle>
        </DialogHeader>
        <form id="add-doc-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register("title", { required: "Required" })}
              placeholder="Document title"
              className={errors.title ? "border-destructive" : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="file_url">File URL *</Label>
            <Input
              id="file_url"
              {...register("file_url", { required: "Required" })}
              placeholder="https://..."
              className={errors.file_url ? "border-destructive" : ""}
            />
          </div>
          {/* Fix #3: wire document_type */}
          <div className="space-y-1.5">
            <Label htmlFor="document_type">Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger id="document_type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {["Proposal", "Budget Sheet", "Approval", "Contract", "Report", "Other"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {createDoc.isError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {createDoc.error instanceof ApiError ? createDoc.error.message : "Failed to add document"}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); setDocType(""); }}>Cancel</Button>
          <Button type="submit" form="add-doc-form" disabled={createDoc.isPending}>
            {createDoc.isPending ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Adding...</>
            ) : "Add Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Campaign Detail Panel ──────────────────────────────────────────────────────

function CampaignDetailPanel({
  campaign,
  onClose,
}: {
  campaign: Campaign;
  onClose: () => void;
}) {
  const { data: documents = [], isLoading: docsLoading } = useCampaignDocuments({ campaign: campaign.id });
  const deleteDoc = useDeleteCampaignDocument();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();

  const status = campaign.status;
  const canSubmitBudget = status === "draft";
  const canReviewVariance = status === "budget_variance_pending";
  // Fix #2: workflow start only from pending_workflow
  const canStartWorkflow = status === "pending_workflow";
  const canCancel = !["cancelled", "rejected", "internally_approved", "finance_pending", "finance_approved", "finance_rejected"].includes(status);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">{campaign.name}</h2>
            <p className="text-xs text-muted-foreground font-mono">{campaign.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={campaign.status} />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Requested", value: formatBudget(campaign.requested_amount, campaign.currency) },
              { label: "Approved", value: formatBudget(campaign.approved_amount, campaign.currency) },
              { label: "Currency", value: campaign.currency },
              { label: "Category", value: campaign.category_name ?? campaign.category ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-2 rounded-lg border border-border bg-secondary/20 p-2.5">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Subcategory + Budget */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Subcategory", value: campaign.subcategory_name ?? campaign.subcategory ?? "—" },
              { label: "Budget", value: campaign.budget ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-2 rounded-lg border border-border bg-secondary/20 p-2.5">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Start Date", value: formatDate(campaign.start_date) },
              { label: "End Date", value: formatDate(campaign.end_date) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-2 rounded-lg border border-border bg-secondary/20 p-2.5">
                <Calendar className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          {campaign.description && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h3>
              <p className="text-sm text-muted-foreground">{campaign.description}</p>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              {canSubmitBudget && <SubmitBudgetDialog campaign={campaign} />}
              {canReviewVariance && <ReviewVarianceDialog campaign={campaign} />}
              {canStartWorkflow && <StartWorkflowDialog campaign={campaign} />}
              <CampaignFormDialog
                mode="edit"
                initial={campaign}
                orgId={campaign.org}
                onSubmit={async (data) => {
                  await updateCampaign.mutateAsync({ id: campaign.id, data: data as UpdateCampaignRequest });
                }}
                onCancel={() => {}}
                isSaving={updateCampaign.isPending}
                error={updateCampaign.error}
                submitLabel="Save Changes"
              />
              <DeleteCampaignDialog
                campaign={campaign}
                onClose={() => {}}
                isDeleting={deleteCampaign.isPending}
                error={deleteCampaign.error}
                onConfirm={() => deleteCampaign.mutateAsync(campaign.id)}
              />
              {canCancel && <CancelCampaignDialog campaign={campaign} />}
            </div>
          </div>

          <Separator />

          {/* Documents */}
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Documents
            </h3>
            {docsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : documents.length === 0 ? (
              <p className="rounded-md border border-border bg-secondary/20 p-2 text-xs text-muted-foreground">
                No documents
              </p>
            ) : (
              <div className="space-y-1">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-secondary/20 px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm truncate hover:underline"
                      >
                        {doc.title}
                      </a>
                    </div>
                    <button
                      onClick={() => deleteDoc.mutate(doc.id)}
                      className="flex-shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2">
              <AddDocumentDialog campaign={campaign} />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const CampaignsPage = () => {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();
  const { data: campaignResponse, isLoading: campaignsLoading } = useCampaigns(
    {
      org: selectedOrgId ?? undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      page,
    },
  );
  const campaigns = campaignResponse?.results ?? [];
  const campaignCount = campaignResponse?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(campaignCount / 20));
  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  const createCampaign = useCreateCampaign();

  // Fix #4: use useEffect for auto-select, not render-time side effect
  useEffect(() => {
    if (!selectedOrgId && organizations.length === 1 && organizations[0]) {
      setSelectedOrgId(organizations[0].id);
    }
  }, [selectedOrgId, organizations]);

  useEffect(() => {
    if (selectedCampaignId && !campaignsLoading && !selectedCampaign) {
      setSelectedCampaignId(null);
    }
  }, [campaignsLoading, selectedCampaign, selectedCampaignId]);

  return (
    <V2Shell
      title="Campaigns"
      titleIcon={<Megaphone className="h-5 w-5 text-muted-foreground" />}
      actions={
        <CampaignFormDialog
          mode="create"
          orgId={selectedOrgId}
          scopeNodeId={null}
          onSubmit={async (data) => {
            await createCampaign.mutateAsync(data as CreateCampaignRequest);
          }}
          onCancel={() => {}}
          isSaving={createCampaign.isPending}
          error={createCampaign.error}
          submitLabel="Create Campaign"
        />
      }
    >
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: org selector + campaign list */}
        <aside className="flex w-80 flex-col border-r border-border bg-background">
          {/* Org selector */}
          <div className="border-b border-border p-3">
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Organization
            </Label>
            {orgsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <Select
                value={selectedOrgId ?? ""}
                onValueChange={(v) => {
                  setSelectedOrgId(v);
                  setSelectedCampaignId(null);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Status filter */}
          <div className="border-b border-border p-3">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setSelectedCampaignId(null);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaign list */}
          <div className="flex-1 overflow-y-auto">
            {!selectedOrgId ? (
              <div className="p-4 text-sm text-muted-foreground">
                Select an organization to see campaigns
              </div>
            ) : campaignsLoading ? (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading campaigns...
              </div>
            ) : campaigns.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No campaigns found
              </div>
            ) : (
              <div className="py-1">
                <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
                  <span>
                    Showing {(page - 1) * 20 + 1}-{(page - 1) * 20 + campaigns.length} of {campaignCount}
                  </span>
                  <span>Page {page} of {totalPages}</span>
                </div>
                {campaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
                      campaign.id === selectedCampaignId ? "bg-accent" : ""
                    }`}
                    onClick={() => setSelectedCampaignId(campaign.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{campaign.name}</span>
                        <StatusBadge status={campaign.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span className="font-mono">{campaign.code}</span>
                        <span>{formatBudget(campaign.requested_amount, campaign.currency)}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </button>
                ))}
                <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-border bg-background/95 p-2 backdrop-blur">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!campaignResponse?.previous || campaignsLoading}
                    onClick={() => {
                      setSelectedCampaignId(null);
                      setPage((current) => Math.max(1, current - 1));
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!campaignResponse?.next || campaignsLoading}
                    onClick={() => {
                      setSelectedCampaignId(null);
                      setPage((current) => current + 1);
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right panel: campaign detail */}
        <main className="flex-1 overflow-hidden bg-secondary/10">
          {selectedCampaign ? (
            <CampaignDetailPanel
              campaign={selectedCampaign}
              onClose={() => setSelectedCampaignId(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a campaign to view details
            </div>
          )}
        </main>
      </div>
    </V2Shell>
  );
};

export default CampaignsPage;
