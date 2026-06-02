/**
 * FinanceInvoiceReviewPage — authenticated finance review page for invoices/campaigns.
 *
 * Route: /finance/invoices/:id
 *
 * Uses authenticated API endpoints instead of token-based ones.
 * Reuses UI patterns from FinanceReviewPage.tsx.
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { getFinanceHandoffReview, approveFinanceHandoff, rejectFinanceHandoff } from "@/lib/api/v2finance";
import type { PublicFinanceToken } from "@/lib/types/v2finance";
import {
  InvoiceFinanceData,
  InvoiceFinanceVendor,
  InvoiceFinanceDocument,
  InvoiceFinanceAllocation,
  InvoiceFinanceWorkflow,
  InvoiceFinanceTimelineEvent,
} from "@/lib/types/v2finance";
import { FinanceShell } from "@/components/v2/FinanceShell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceDocumentsTab } from "@/components/finance/FinanceDocumentsTab";
import {
  CheckCircle2, XCircle, Loader2, FileText,
  Building2, Download, AlertTriangle, Info, ArrowLeft, CreditCard, Landmark,
  GitBranch, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { RecordPaymentButton } from "@/components/invoices/RecordPaymentDialog";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: string, currency = "INR"): string {
  const num = parseFloat(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

function fmtDate(val: string | null): string {
  if (!val) return "—";
  try { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(val)); }
  catch { return val; }
}

function fmtDateTime(val: string | null): string {
  if (!val) return "—";
  try { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(val)); }
  catch { return val; }
}

function StatusBadge({ label, variant = "default" }: { label: string; variant?: "default" | "success" | "danger" | "warning" | "outline" }) {
  const cls = {
    default: "bg-muted text-muted-foreground",
    success: "bg-green-100 text-green-800",
    danger: "bg-red-100 text-red-800",
    warning: "bg-amber-100 text-amber-800",
    outline: "border text-foreground",
  }[variant];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const detail = (err.errors as Record<string, string[]>)?.detail;
    if (Array.isArray(detail)) return detail[0];
    if (typeof detail === "string") return detail;
    return err.message ?? "An error occurred";
  }
  if (err instanceof Error) return err.message;
  return "An error occurred";
}

function emptyDash(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function DetailRows({ rows }: { rows: Array<[string, string | number | null | undefined]> }) {
  return (
    <div className="space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4">
          <span className="text-muted-foreground shrink-0">{label}</span>
          <span className="font-medium text-right break-words">{emptyDash(value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Invoice Overview Tab ───────────────────────────────────────────────────────

function OverviewTab({ data }: { data: PublicFinanceToken }) {
  const inv: InvoiceFinanceData | undefined = data.invoice;
  const vendor: InvoiceFinanceVendor | undefined = data.vendor;
  const handoff = data.handoff;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            ["Title", inv?.title ?? "—"],
            ["Amount", inv ? fmt(inv.amount, inv.currency) : "—"],
            ["Status", inv?.status ?? "—"],
            ["PO Number", inv?.po_number ?? "—"],
            ["Vendor Invoice #", inv?.vendor_invoice_number ?? "—"],
            ["Invoice Date", fmtDate(inv?.invoice_date ?? null)],
            ["Due Date", fmtDate(inv?.due_date ?? null)],
            ["Entity", inv?.scope_node_name ?? "—"],
            ["Description", inv?.description ?? "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <span className="text-muted-foreground shrink-0">{k}</span>
              <span className="font-medium text-right">{v}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {vendor && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Vendor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["Name", vendor.vendor_name],
                ["Email", vendor.email ?? "—"],
                ["Phone", vendor.phone ?? "—"],
                ["GSTIN", vendor.gstin ?? "—"],
                ["PAN", vendor.pan ?? "—"],
                ["SAP Vendor ID", vendor.sap_vendor_id ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right text-xs">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              Handoff Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Status", handoff?.status ?? data.handoff_status],
              ["Sent At", fmtDateTime(handoff?.sent_at ?? null)],
              ["Finance Ref", handoff?.finance_reference_id ?? "—"],
              ["Recipients", handoff?.recipient_count ? `${handoff.recipient_count} recipient${handoff.recipient_count !== 1 ? "s" : ""}` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium text-right text-xs">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Documents Tab ─────────────────────────────────────────────────────────────

function VendorDetailsTab({ vendor }: { vendor?: InvoiceFinanceVendor }) {
  if (!vendor) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No vendor details available for this invoice.
      </div>
    );
  }

  const bankBranchAddress = [
    vendor.bank_branch_address_line1,
    vendor.bank_branch_address_line2,
    vendor.bank_branch_city,
    vendor.bank_branch_state,
    vendor.bank_branch_country,
    vendor.bank_branch_pincode,
  ].filter(Boolean).join(", ");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Vendor Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRows
            rows={[
              ["Vendor Name", vendor.vendor_name],
              ["Email", vendor.email],
              ["Phone", vendor.phone],
              ["GSTIN", vendor.gstin],
              ["PAN", vendor.pan],
              ["SAP Vendor ID", vendor.sap_vendor_id],
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRows
            rows={[
              ["Preferred Payment Mode", vendor.preferred_payment_mode],
              ["Beneficiary Name", vendor.beneficiary_name],
              ["Beneficiary Account No", vendor.beneficiary_account_number],
              ["Account No", vendor.account_number],
              ["Bank Account No", vendor.bank_account_number],
              ["Account Type", vendor.bank_account_type],
            ]}
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Bank Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          <DetailRows
            rows={[
              ["Bank Name", vendor.bank_name],
              ["Bank Address", vendor.bank_address],
              ["Bank Email", vendor.bank_email],
              ["IFSC Code", vendor.ifsc],
              ["MICR Code", vendor.micr_code],
              ["NEFT Code", vendor.neft_code],
            ]}
          />
          <DetailRows
            rows={[
              ["Bank Branch Address", bankBranchAddress],
              ["Bank Phone", vendor.bank_phone],
              ["Bank Fax", vendor.bank_fax],
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentsTab({ docs }: { docs: InvoiceFinanceDocument[] }) {
  if (!docs || docs.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No documents available.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{doc.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {doc.document_type} · Uploaded {fmtDate(doc.uploaded_at)}
              </p>
            </div>
          </div>
          {doc.url ? (
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="ml-3 shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Download className="h-3.5 w-3.5" /> View
            </a>
          ) : (
            <span className="text-xs text-muted-foreground ml-3 shrink-0">No file</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Allocations Tab ──────────────────────────────────────────────────────────

function AllocationsTab({ allocs }: { allocs: InvoiceFinanceAllocation[] }) {
  if (!allocs || allocs.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No split allocations for this invoice.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {["Entity", "Amount", "Category", "Subcategory", "Campaign", "Budget", "Approver", "Status", "Note"].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allocs.map(a => (
            <tr key={a.id} className="border-b hover:bg-muted/30">
              <td className="px-3 py-2">{a.entity_name ?? "—"}</td>
              <td className="px-3 py-2 font-medium">{fmt(a.amount)}</td>
              <td className="px-3 py-2">{a.category_name ?? "—"}</td>
              <td className="px-3 py-2">{a.subcategory_name ?? "—"}</td>
              <td className="px-3 py-2">{a.campaign_name ?? "—"}</td>
              <td className="px-3 py-2">{a.budget_name ?? "—"}</td>
              <td className="px-3 py-2">{a.selected_approver_email ?? "—"}</td>
              <td className="px-3 py-2"><StatusBadge label={a.status} /></td>
              <td className="px-3 py-2 text-xs text-muted-foreground max-w-[120px] truncate">{a.note ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Workflow Tab ──────────────────────────────────────────────────────────────

function WorkflowTab({ workflow, timeline }: { workflow: InvoiceFinanceWorkflow | undefined; timeline: InvoiceFinanceTimelineEvent[] }) {
  if (!workflow && (!timeline || timeline.length === 0)) {
    return <div className="text-center text-sm text-muted-foreground py-8">No workflow data available.</div>;
  }
  return (
    <div className="space-y-6">
      {workflow?.groups?.map((group) => (
        <div key={group.name} className="space-y-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{group.name}</h3>
            <StatusBadge label={group.status} />
          </div>
          <div className="ml-6 space-y-1.5">
            {group.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border p-2 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{step.name}</p>
                  <p className="text-muted-foreground">{step.assigned_user_email ?? "Unassigned"}</p>
                  {step.note && <p className="text-muted-foreground mt-0.5 italic">"{step.note}"</p>}
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge label={step.status} variant={step.status === "APPROVED" ? "success" : step.status === "REJECTED" ? "danger" : "default"} />
                  {step.acted_at && <p className="text-muted-foreground mt-0.5">{fmtDateTime(step.acted_at)}</p>}
                </div>
              </div>
            ))}
            {group.branches.map((branch, i) => (
              <div key={`br-${i}`} className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 p-2 text-xs ml-4">
                <GitBranch className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Branch: {branch.entity_name ?? "—"}</p>
                  <p className="text-muted-foreground">{branch.assigned_user_email ?? "Unassigned"}</p>
                  {branch.note && <p className="text-muted-foreground mt-0.5 italic">"{branch.note}"</p>}
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge label={branch.status} variant={branch.status === "APPROVED" ? "success" : branch.status === "REJECTED" ? "danger" : "default"} />
                  {branch.acted_at && <p className="text-muted-foreground mt-0.5">{fmtDateTime(branch.acted_at)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {timeline && timeline.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" /> Timeline
          </h3>
          <div className="space-y-1.5">
            {timeline.map((ev, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">{ev.event_type.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground ml-1">by {ev.actor_email ?? "system"}</span>
                  <span className="text-muted-foreground ml-1">· {fmtDateTime(ev.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Decision Panel ────────────────────────────────────────────────────────────

function DecisionPanel({
  handoffId,
  data,
  onSuccess,
}: {
  handoffId: string;
  data: PublicFinanceToken;
  onSuccess: () => void;
}) {
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [referenceId, setReferenceId] = useState("");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const approveMutation = useMutation({
    mutationFn: () => approveFinanceHandoff(handoffId, {
      reference_id: referenceId.trim(),
      note: note.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success("Invoice approved successfully");
      onSuccess();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectFinanceHandoff(handoffId, { note: note.trim() }),
    onSuccess: () => {
      toast.success("Invoice rejected successfully");
      onSuccess();
    },
  });

  const isPending = approveMutation.isPending || rejectMutation.isPending;
  const apiError = approveMutation.error ?? rejectMutation.error;

  const handleSubmit = () => {
    setLocalError(null);
    if (action === "approve" && !referenceId.trim()) {
      setLocalError("Finance reference ID is required for approval.");
      return;
    }
    if (action === "reject" && !note.trim()) {
      setLocalError("Rejection reason is required.");
      return;
    }
    if (action === "approve") approveMutation.mutate();
    else rejectMutation.mutate();
  };

  // Already completed
  if (data.is_used || data.handoff_status === "finance_approved" || data.handoff_status === "finance_rejected") {
    const invoiceId = data.invoice?.id;
    const isApproved = data.handoff_status === "finance_approved";
    const canRecordPayment = data.invoice?.can_record_payment === true;

    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isApproved ? (
              <>
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Approved</p>
                  <p className="text-xs text-muted-foreground">
                    Ref: {data.handoff?.finance_reference_id ?? "—"}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">Rejected</p>
                  <p className="text-xs text-muted-foreground">Decision recorded</p>
                </div>
              </>
            )}
          </div>

          {isApproved && invoiceId && canRecordPayment && (
            <RecordPaymentButton
              invoiceId={String(invoiceId)}
              additionalInvalidateKeys={[
                ["finance", "handoffs"],
                ["finance", "handoff", "review", handoffId],
              ]}
              onSuccess={onSuccess}
            />
          )}
        </div>
      </div>
    );
  }

  // Pending decision
  if (action === null) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Finance Decision</p>
            <p className="text-xs text-muted-foreground">Review the details and record your decision</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-emerald-500/50 text-emerald-700 hover:bg-emerald-50"
              onClick={() => { setAction("approve"); setNote(""); setLocalError(null); }}
            >
              <CheckCircle2 className="h-4 w-4" /> Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/5"
              onClick={() => { setAction("reject"); setReferenceId(""); setLocalError(null); }}
            >
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Action form
  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          {action === "approve" ? "Approve Invoice" : "Reject Invoice"}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setAction(null); setLocalError(null); }}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>

      {action === "approve" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ref-id" className="text-xs">Finance Reference ID *</Label>
            <Input
              id="ref-id"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. SAP-2025-00123"
              autoFocus
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-xs">Note (optional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note..."
              className="h-9"
            />
          </div>
        </div>
      )}

      {action === "reject" && (
        <div className="space-y-1.5">
          <Label htmlFor="note" className="text-xs">Rejection Reason *</Label>
          <textarea
            id="note"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain why this invoice is being rejected..."
            autoFocus
          />
        </div>
      )}

      {(localError || apiError) && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {localError ?? errorMessage(apiError)}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isPending}
          variant={action === "approve" ? "default" : "destructive"}
          size="sm"
          className="gap-1.5"
        >
          {isPending ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...</>
          ) : action === "approve" ? (
            <><CheckCircle2 className="h-3.5 w-3.5" /> Confirm Approval</>
          ) : (
            <><XCircle className="h-3.5 w-3.5" /> Confirm Rejection</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FinanceInvoiceReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const reviewQuery = useQuery({
    queryKey: ["finance", "handoff", "review", id],
    queryFn: () => getFinanceHandoffReview(id!),
    enabled: !!id,
    retry: false,
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["finance", "handoffs"] });
    navigate("/finance/invoices");
  };

  if (reviewQuery.isLoading) {
    return (
      <FinanceShell title="Loading...">
        <div className="flex items-center justify-center flex-1">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading review data...
          </div>
        </div>
      </FinanceShell>
    );
  }

  if (reviewQuery.isError || !reviewQuery.data) {
    return (
      <FinanceShell
        title="Error"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Invoice Reviews", href: "/finance/invoices" },
          { label: "Error" },
        ]}
      >
        <div className="flex items-center justify-center flex-1">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8">
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-bold text-foreground mb-2">Error Loading Review</h1>
              <p className="text-sm text-muted-foreground mb-4">{errorMessage(reviewQuery.error)}</p>
              <Button variant="outline" onClick={() => navigate("/finance/invoices")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Reviews
              </Button>
            </CardContent>
          </Card>
        </div>
      </FinanceShell>
    );
  }

  const data = reviewQuery.data;
  const inv = data.invoice;

  return (
    <FinanceShell
      title={inv?.title ?? data.subject_name}
      breadcrumbs={[
        { label: "Finance", href: "/finance" },
        { label: "Invoice Reviews", href: "/finance/invoices" },
        { label: inv?.title ?? data.subject_name },
      ]}
      actions={
        <Button variant="ghost" size="sm" onClick={() => navigate("/finance/invoices")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
      }
    >
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-4">
          {/* Decision Panel - at the top */}
          <DecisionPanel handoffId={id!} data={data} onSuccess={handleSuccess} />

          {/* Main content */}
          {data.module === "invoice" && data.invoice ? (
            <Tabs defaultValue="overview" className="w-full">
              <div className="overflow-x-auto pb-px mb-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="vendor">Vendor Details</TabsTrigger>
                  <TabsTrigger value="documents">
                    Documents{data.documents?.length ? ` (${data.documents.length})` : ""}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview">
                <OverviewTab data={data} />
              </TabsContent>
              <TabsContent value="vendor">
                <VendorDetailsTab vendor={data.vendor} />
              </TabsContent>
              <TabsContent value="documents">
                <FinanceDocumentsTab docs={data.documents ?? []} />
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Review Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ["Module", data.module],
                  ["Subject", data.subject_name],
                  ["Type", data.subject_type],
                  ["Status", data.handoff_status],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </FinanceShell>
  );
}
