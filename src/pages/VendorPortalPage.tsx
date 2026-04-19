/**
 * VendorPortalPage — self-service portal for vendor-role users.
 *
 * Tabs:
 *   A. My Invoices      — all submitted invoices and in-progress drafts
 *   B. Submit Invoice  — upload Excel/PDF OR manual entry
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyVendor } from "@/lib/hooks/useV2Vendor";
import {
  useInvoices,
  useSubmissions,
  useSubmission,
  useCreateSubmission,
  useExtractSubmission,
  useUpdateSubmissionFields,
  useSubmitSubmission,
  useCancelSubmission,
  useAddSubmissionDocument,
} from "@/lib/hooks/useV2Invoice";
import { useQuery } from "@tanstack/react-query";
import { showErrorToast, extractErrorMessage } from "@/lib/utils/toast-error";
import type { Vendor } from "@/lib/types/v2vendor";
import type {
  Invoice,
  VendorInvoiceSubmission,
  NormalizedInvoiceData,
} from "@/lib/types/v2invoice";
import { ApiError } from "@/lib/api/client";
import {
  SUBMISSION_STATUS_LABELS,
  type SubmissionStatus,
} from "@/lib/types/v2invoice";
import {
  LogOut,
  FileText,
  Upload,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  Paperclip,
  X,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileType,
  Edit3,
  Ban,
  Eye,
} from "lucide-react";

const invoiceInputCls = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50";
const invoiceErrCls = "border-destructive";
const invoiceLblCls = "block text-xs font-medium text-foreground mb-1.5";
const invoiceErrMsgCls = "mt-1 text-xs text-destructive";

function InvoiceFormFields({
  form,
  onChange,
  validationErrors,
  showPo,
  readOnly = false,
}: {
  form: NormalizedInvoiceData;
  onChange: (key: keyof NormalizedInvoiceData, value: string) => void;
  validationErrors: Record<string, string>;
  showPo: boolean;
  readOnly?: boolean;
}) {
  const readOnlyCls = readOnly ? "opacity-70 cursor-not-allowed" : "";

  return (
    <div className="space-y-4">
      <div>
        <label className={invoiceLblCls}>Your Invoice Reference <span className="text-destructive">*</span></label>
        {readOnly ? (
          <p className="text-sm py-2">{form.vendor_invoice_number || "â€”"}</p>
        ) : (
          <input
            type="text"
            value={form.vendor_invoice_number || ""}
            onChange={(e) => onChange("vendor_invoice_number", e.target.value)}
            className={`${invoiceInputCls} ${validationErrors.vendor_invoice_number ? invoiceErrCls : ""} ${readOnlyCls}`}
          />
        )}
        {validationErrors.vendor_invoice_number && <p className={invoiceErrMsgCls}>{validationErrors.vendor_invoice_number}</p>}
      </div>
      {showPo && (
        <div>
          <label className={invoiceLblCls}>PO Number <span className="text-destructive">*</span></label>
          {readOnly ? (
            <p className="text-sm py-2">{form.po_number || "â€”"}</p>
          ) : (
            <input
              type="text"
              value={form.po_number || ""}
              onChange={(e) => onChange("po_number", e.target.value)}
              placeholder="e.g. PO-2026-00123"
              className={`${invoiceInputCls} ${validationErrors.po_number ? invoiceErrCls : ""}`}
            />
          )}
          {validationErrors.po_number && <p className={invoiceErrMsgCls}>{validationErrors.po_number}</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={invoiceLblCls}>Invoice Date <span className="text-destructive">*</span></label>
          {readOnly ? (
            <p className="text-sm py-2">{form.invoice_date || "â€”"}</p>
          ) : (
            <input
              type="date"
              value={form.invoice_date || ""}
              onChange={(e) => onChange("invoice_date", e.target.value)}
              className={`${invoiceInputCls} ${validationErrors.invoice_date ? invoiceErrCls : ""}`}
            />
          )}
          {validationErrors.invoice_date && <p className={invoiceErrMsgCls}>{validationErrors.invoice_date}</p>}
        </div>
        <div>
          <label className={invoiceLblCls}>Due Date</label>
          {readOnly ? (
            <p className="text-sm py-2">{form.due_date || "â€”"}</p>
          ) : (
            <input
              type="date"
              value={form.due_date || ""}
              onChange={(e) => onChange("due_date", e.target.value)}
              className={invoiceInputCls}
            />
          )}
        </div>
      </div>
      <div>
        <label className={invoiceLblCls}>Currency <span className="text-destructive">*</span></label>
        {readOnly ? (
          <p className="text-sm py-2">{form.currency || "â€”"}</p>
        ) : (
          <input
            type="text"
            value={form.currency || ""}
            onChange={(e) => onChange("currency", e.target.value.toUpperCase())}
            maxLength={3}
            className={`${invoiceInputCls} ${validationErrors.currency ? invoiceErrCls : ""}`}
          />
        )}
        {validationErrors.currency && <p className={invoiceErrMsgCls}>{validationErrors.currency}</p>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={invoiceLblCls}>Subtotal</label>
          {readOnly ? (
            <p className="text-sm py-2">{form.subtotal_amount || "â€”"}</p>
          ) : (
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.subtotal_amount || ""}
              onChange={(e) => onChange("subtotal_amount", e.target.value)}
              className={invoiceInputCls}
            />
          )}
        </div>
        <div>
          <label className={invoiceLblCls}>Tax</label>
          {readOnly ? (
            <p className="text-sm py-2">{form.tax_amount || "â€”"}</p>
          ) : (
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.tax_amount || ""}
              onChange={(e) => onChange("tax_amount", e.target.value)}
              className={invoiceInputCls}
            />
          )}
        </div>
        <div>
          <label className={invoiceLblCls}>Total <span className="text-destructive">*</span></label>
          {readOnly ? (
            <p className="text-sm py-2 font-medium">{form.total_amount || "â€”"}</p>
          ) : (
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.total_amount || ""}
              onChange={(e) => onChange("total_amount", e.target.value)}
              className={`${invoiceInputCls} ${validationErrors.total_amount ? invoiceErrCls : ""}`}
            />
          )}
          {validationErrors.total_amount && <p className={invoiceErrMsgCls}>{validationErrors.total_amount}</p>}
        </div>
      </div>
      <div>
        <label className={invoiceLblCls}>Description</label>
        {readOnly ? (
          <p className="text-sm py-2 whitespace-pre-wrap">{form.description || "â€”"}</p>
        ) : (
          <textarea
            value={form.description || ""}
            onChange={(e) => onChange("description", e.target.value)}
            rows={3}
            className={`${invoiceInputCls} resize-none`}
          />
        )}
      </div>
    </div>
  );
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  draft: { label: "Draft", icon: <FileText className="w-3.5 h-3.5" />, color: "text-muted-foreground bg-muted" },
  pending: { label: "Pending", icon: <Clock className="w-3.5 h-3.5" />, color: "text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/40" },
  in_review: { label: "Under Review", icon: <Clock className="w-3.5 h-3.5" />, color: "text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/40" },
  internally_approved: { label: "Approved", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/40" },
  finance_pending: { label: "Finance Pending", icon: <Clock className="w-3.5 h-3.5" />, color: "text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/40" },
  finance_approved: { label: "Finance Approved", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/40" },
  finance_rejected: { label: "Finance Rejected", icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/40" },
  rejected: { label: "Rejected", icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/40" },
  paid: { label: "Paid", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40" },
  uploaded: { label: "Uploaded", icon: <Upload className="w-3.5 h-3.5" />, color: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40" },
  extracting: { label: "Extracting…", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40" },
  needs_correction: { label: "Needs Correction", icon: <AlertCircle className="w-3.5 h-3.5" />, color: "text-orange-700 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/40" },
  ready: { label: "Ready to Submit", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/40" },
  submitted: { label: "Submitted", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/40" },
  cancelled: { label: "Cancelled", icon: <XCircle className="w-3.5 h-3.5" />, color: "text-muted-foreground bg-muted" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, icon: null, color: "text-muted-foreground bg-muted" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function fmtAmount(amount: string, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "INR", minimumFractionDigits: 2 }).format(parseFloat(amount));
  } catch { return `${currency} ${amount}`; }
}

function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return dateStr; }
}

// ── Portal header ─────────────────────────────────────────────────────────────

function PortalHeader({ vendorName, userName, onLogout }: { vendorName: string; userName: string; onLogout: () => void }) {
  return (
    <header className="sticky top-0 z-20 bg-card border-b border-border px-4 sm:px-6 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">IF</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{vendorName || "Vendor Portal"}</p>
            {userName && <p className="text-xs text-muted-foreground">{userName}</p>}
          </div>
        </div>
        <button onClick={onLogout} className="text-muted-foreground hover:text-foreground transition-colors" title="Sign out">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

// ── My Invoices tab ───────────────────────────────────────────────────────────

function MyInvoicesTab() {
  const { data: invoices = [], isLoading: invLoading } = useInvoices();
  const { data: submissions = [], isLoading: subLoading } = useSubmissions();

  const isLoading = invLoading || subLoading;
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<VendorInvoiceSubmission | null>(null);

  type MergedRow =
    | { kind: "invoice"; data: Invoice }
    | { kind: "submission"; data: typeof submissions[0] };

  const rows: MergedRow[] = [
    ...invoices.map((i) => ({ kind: "invoice" as const, data: i })),
    ...submissions.filter((s) => s.status !== "submitted").map((s) => ({ kind: "submission" as const, data: s })),
  ].sort((a, b) => b.data.created_at.localeCompare(a.data.created_at));

  return (
    <div className="space-y-3">
      {successMsg && (
        <div className="px-4 py-2.5 rounded-xl text-sm font-medium bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400">
          {successMsg}
        </div>
      )}
      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
        </div>
      )}
      {!isLoading && rows.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No invoices yet</p>
          <p className="text-xs text-muted-foreground">Submit your first invoice using the Submit Invoice tab.</p>
        </div>
      )}
      {!isLoading && rows.map((row) =>
        row.kind === "invoice"
          ? <InvoiceRow key={`inv-${row.data.id}`} invoice={row.data} />
          : <SubmissionRow key={`sub-${row.data.id}`} submission={row.data} onClick={() => setSelectedSubmission(row.data)} />
      )}

      {selectedSubmission && (
        <SubmissionDetailPanel
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onUpdated={() => {}}
        />
      )}
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border bg-card overflow-hidden border-border">
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {invoice.title || invoice.vendor_invoice_number || invoice.id.slice(0, 8)}
            </p>
            <p className="text-xs text-muted-foreground">{fmtDate(invoice.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <StatusBadge status={invoice.status} />
          <span className="text-sm font-semibold text-foreground">{fmtAmount(invoice.amount, invoice.currency)}</span>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div><span className="text-muted-foreground block mb-0.5">Invoice Ref</span><span className="font-medium">{invoice.vendor_invoice_number || "—"}</span></div>
            <div><span className="text-muted-foreground block mb-0.5">PO Number</span><span className="font-medium">{invoice.po_number || "—"}</span></div>
            <div><span className="text-muted-foreground block mb-0.5">Invoice Date</span><span className="font-medium">{fmtDate(invoice.invoice_date)}</span></div>
            <div><span className="text-muted-foreground block mb-0.5">Due Date</span><span className="font-medium">{fmtDate(invoice.due_date)}</span></div>
            <div><span className="text-muted-foreground block mb-0.5">Created</span><span className="font-medium">{fmtDate(invoice.created_at)}</span></div>
            <div><span className="text-muted-foreground block mb-0.5">Currency</span><span className="font-medium">{invoice.currency}</span></div>
            <div><span className="text-muted-foreground block mb-0.5">Amount</span><span className="font-medium">{fmtAmount(invoice.amount, invoice.currency)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionRow({ submission, onClick }: { submission: VendorInvoiceSubmission; onClick: () => void }) {
  const nd = submission.normalized_data || {};
  const isActionable = submission.status === "needs_correction" || submission.status === "ready";
  return (
    <div className="rounded-xl border bg-card overflow-hidden border-border">
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors"
        onClick={onClick}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Upload className="w-4 h-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {nd.vendor_invoice_number || submission.source_file_name || "Draft"}
            </p>
            <p className="text-xs text-muted-foreground">{fmtDate(submission.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <StatusBadge status={submission.status} />
          {submission.confidence_percent != null && (
            <span className="text-xs text-muted-foreground">{submission.confidence_percent}%</span>
          )}
          {isActionable && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
    </div>
  );
}

// ── Submission Detail Panel ───────────────────────────────────────────────────

function SubmissionDetailPanel({
  submission,
  onClose,
  onUpdated,
}: {
  submission: VendorInvoiceSubmission;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const nd = submission.normalized_data || {};
  const [form, setForm] = useState<NormalizedInvoiceData>({ ...nd });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const updateSub = useUpdateSubmissionFields();
  const extractSub = useExtractSubmission();
  const submitSub = useSubmitSubmission();
  const cancelSub = useCancelSubmission();

  const isBusy = updateSub.isPending || extractSub.isPending || submitSub.isPending || cancelSub.isPending;

  function handleFieldChange(key: keyof NormalizedInvoiceData, value: string) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "subtotal_amount" || key === "tax_amount") {
        const sub = parseFloat(next.subtotal_amount) || 0;
        const tax = parseFloat(next.tax_amount) || 0;
        next.total_amount = (sub + tax).toFixed(2);
      }
      return next;
    });
    setValidationErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  function validateForm(data: NormalizedInvoiceData): boolean {
    const errs: Record<string, string> = {};
    if (!data.vendor_invoice_number?.trim()) errs.vendor_invoice_number = "Required";
    if (!data.invoice_date) errs.invoice_date = "Required";
    if (!data.currency?.trim()) errs.currency = "Required";
    const total = parseFloat(data.total_amount || "0") || (parseFloat(data.subtotal_amount || "0") + parseFloat(data.tax_amount || "0"));
    if (!total || total <= 0) errs.total_amount = "Total amount is required";
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleReextract() {
    try {
      const result = await extractSub.mutateAsync(submission.id);
      setForm(result.normalized_data);
      const fieldErrors: Record<string, string> = {};
      for (const err of result.validation_errors || []) fieldErrors[err.field] = err.message;
      setValidationErrors(fieldErrors);
    } catch (err) {
      showErrorToast(extractErrorMessage(err, "Re-extraction failed. Please try again."));
    }
  }

  async function handleSaveAndSubmit() {
    if (!validateForm(form)) return;
    try {
      await updateSub.mutateAsync({ id: submission.id, data: { normalized_data: form } });
      await submitSub.mutateAsync(submission.id);
      setSuccessMsg("Invoice submitted for review.");
      setTimeout(() => { onUpdated(); onClose(); }, 1500);
    } catch (err) {
      showErrorToast(extractErrorMessage(err, "Failed to submit. Please try again."));
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this submission? This cannot be undone.")) return;
    try {
      await cancelSub.mutateAsync(submission.id);
      onUpdated();
      onClose();
    } catch (err) {
      showErrorToast(extractErrorMessage(err, "Failed to cancel submission."));
    }
  }

  const status = submission.status;
  const isReadOnly = status === "submitted" || status === "cancelled";
  const isNeedsCorrection = status === "needs_correction";
  const isReady = status === "ready";

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50";
  const errCls = "border-destructive";
  const lblCls = "block text-xs font-medium text-foreground mb-1.5";
  const errMsgCls = "mt-1 text-xs text-destructive";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Submission Details</h2>
              <p className="text-xs text-muted-foreground">{submission.source_file_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-2"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {successMsg && (
            <div className="rounded-lg bg-green-50 text-green-700 text-sm px-3 py-2">{successMsg}</div>
          )}

          {/* Validation errors */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5">
              <p className="text-xs font-semibold text-destructive mb-1.5">Please fix the following:</p>
              {Object.entries(validationErrors).map(([f, msg]) => (
                <p key={f} className="text-xs text-destructive">• {msg}</p>
              ))}
            </div>
          )}

          {/* Confidence */}
          {submission.confidence_percent != null && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              <span>Extraction confidence: <strong>{submission.confidence_percent}%</strong></span>
            </div>
          )}

          {/* Documents */}
          {submission.documents && submission.documents.length > 0 && (
            <div>
              <p className={lblCls}>Attached Documents</p>
              <div className="space-y-1.5">
                {submission.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate flex-1">{doc.file_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoice fields */}
          <InvoiceFormFields
            form={form}
            onChange={handleFieldChange}
            validationErrors={validationErrors}
            showPo={false}
            readOnly={isReadOnly}
          />
        </div>

        {/* Actions */}
        {!isReadOnly && (
          <div className="sticky bottom-0 bg-card border-t border-border px-5 py-4 flex gap-3 rounded-b-2xl">
            {isNeedsCorrection && (
              <button
                onClick={handleReextract}
                disabled={extractSub.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-60"
              >
                {extractSub.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Re-extract
              </button>
            )}
            <button
              onClick={handleCancel}
              disabled={isBusy}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-60"
            >
              <Ban className="w-4 h-4" /> Cancel
            </button>
            {(isNeedsCorrection || isReady) && (
              <button
                onClick={handleSaveAndSubmit}
                disabled={isBusy}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Submit for Review
              </button>
            )}
          </div>
        )}

        {isReadOnly && (
          <div className="sticky bottom-0 bg-card border-t border-border px-5 py-4 rounded-b-2xl">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Submit Invoice tab ────────────────────────────────────────────────────────

type SubmitMode = "upload" | "manual";
type Step = "choose" | "upload_idle" | "uploading" | "extracting" | "preview" | "manual_idle" | "manual_filling" | "submitted";

function SubmitInvoiceTab({ vendor }: { vendor: Vendor }) {
  const [mode, setMode] = useState<SubmitMode>("upload");
  const [step, setStep] = useState<Step>("choose");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<NormalizedInvoiceData>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [scopeNode] = useState(vendor.scope_node || "");
  // Upload path state
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);

  // Manual path state
  const [manualScopeNode] = useState(vendor.scope_node || "");
  const [manualInvoiceFile, setManualInvoiceFile] = useState<File | null>(null);
  const [manualSupportingFiles, setManualSupportingFiles] = useState<File[]>([]);
  const [form, setForm] = useState<NormalizedInvoiceData>(EMPTY_FORM());

  const createSub = useCreateSubmission();
  const extractSub = useExtractSubmission();
  const updateSub = useUpdateSubmissionFields();
  const submitSub = useSubmitSubmission();
  const addDoc = useAddSubmissionDocument();

  const isBusy = createSub.isPending || extractSub.isPending || submitSub.isPending;

  function EMPTY_FORM(): NormalizedInvoiceData {
    return {
      vendor_invoice_number: "",
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: "",
      currency: "INR",
      subtotal_amount: "",
      tax_amount: "",
      total_amount: "",
      po_number: "",
      description: "",
    };
  }

  function resetAll() {
    setStep("choose");
    setSubmissionId(null);
    setExtractedData({});
    setForm(EMPTY_FORM());
    setValidationErrors({});
    setInvoiceFile(null);
    setSupportingFiles([]);
    setManualInvoiceFile(null);
    setManualSupportingFiles([]);
    setSuccessMsg(null);
  }

  function handleFieldChange(key: keyof NormalizedInvoiceData, value: string) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "subtotal_amount" || key === "tax_amount") {
        const sub = parseFloat(next.subtotal_amount) || 0;
        const tax = parseFloat(next.tax_amount) || 0;
        next.total_amount = (sub + tax).toFixed(2);
      }
      return next;
    });
    setValidationErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  function validateForm(data: NormalizedInvoiceData): boolean {
    const errs: Record<string, string> = {};
    if (!data.vendor_invoice_number?.trim()) errs.vendor_invoice_number = "Required";
    if (!data.invoice_date) errs.invoice_date = "Required";
    if (!data.currency?.trim()) errs.currency = "Required";
    const total = parseFloat(data.total_amount || "0") || (parseFloat(data.subtotal_amount || "0") + parseFloat(data.tax_amount || "0"));
    if (!total || total <= 0) errs.total_amount = "Total amount is required";
    if (vendor.po_mandate_enabled && !data.po_number?.trim()) {
      errs.po_number = "PO number is required for this vendor";
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Upload path ──────────────────────────────────────────────────────────────

  async function handleUploadExtract() {
    if (!invoiceFile || !scopeNode) return;
    setStep("uploading");
    setValidationErrors({});

    try {
      const sub = await createSub.mutateAsync({
        scope_node: scopeNode,
        source_file: invoiceFile,
      });
      setSubmissionId(sub.id);

      for (const file of supportingFiles) {
        await addDoc.mutateAsync({ id: sub.id, data: { file, document_type: "supporting_document" } });
      }

      setStep("extracting");
      const result = await extractSub.mutateAsync(sub.id);
      setExtractedData(result.normalized_data);
      setForm(result.normalized_data);

      const fieldErrors: Record<string, string> = {};
      for (const err of result.validation_errors || []) fieldErrors[err.field] = err.message;
      setValidationErrors(fieldErrors);
      setStep("preview");
    } catch (err) {
      showErrorToast(extractErrorMessage(err, "Failed to upload invoice. Please try again."));
      setStep("upload_idle");
    }
  }

  async function handleRerunExtraction() {
    if (!submissionId) return;
    setStep("extracting");
    try {
      const result = await extractSub.mutateAsync(submissionId);
      setExtractedData(result.normalized_data);
      setForm(result.normalized_data);
      const fieldErrors: Record<string, string> = {};
      for (const err of result.validation_errors || []) fieldErrors[err.field] = err.message;
      setValidationErrors(fieldErrors);
      setStep("preview");
    } catch (err) {
      showErrorToast(extractErrorMessage(err, "Failed to re-extract. Please fill in details manually."));
      setStep("preview");
    }
  }

  async function handleSubmitForReview() {
    if (!submissionId) return;
    if (!validateForm(form)) return;
    try {
      await updateSub.mutateAsync({ id: submissionId, data: { normalized_data: form } });
      await submitSub.mutateAsync(submissionId);
      setSuccessMsg("Invoice submitted for review.");
      setStep("submitted");
      setTimeout(resetAll, 3000);
    } catch (err) {
      showErrorToast(extractErrorMessage(err, "Failed to submit invoice. Please try again."));
    }
  }

  // ── Manual path ──────────────────────────────────────────────────────────────

  async function handleManualSubmit() {
    if (!manualInvoiceFile || !manualScopeNode) return;
    if (!validateForm(form)) {
      setStep("manual_filling");
      return;
    }
    setStep("uploading");
    setValidationErrors({});

    try {
      const sub = await createSub.mutateAsync({
        scope_node: vendor.scope_node,
        source_file: manualInvoiceFile,
        normalized_data: form,
      });
      setSubmissionId(sub.id);

      for (const file of manualSupportingFiles) {
        await addDoc.mutateAsync({ id: sub.id, data: { file, document_type: "supporting_document" } });
      }

      await submitSub.mutateAsync(sub.id);
      setSuccessMsg("Invoice submitted for review.");
      setStep("submitted");
      setTimeout(resetAll, 3000);
    } catch (err) {
      showErrorToast(extractErrorMessage(err, "Failed to submit invoice. Please try again."));
      setStep("manual_filling");
    }
  }

// ── Shared Invoice Form Fields ────────────────────────────────────────────────

const _inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50";
const _errCls = "border-destructive";
const _lblCls = "block text-xs font-medium text-foreground mb-1.5";
const _errMsgCls = "mt-1 text-xs text-destructive";

function InvoiceFormFields({
  form,
  onChange,
  validationErrors,
  showPo,
  readOnly = false,
}: {
  form: NormalizedInvoiceData;
  onChange: (key: keyof NormalizedInvoiceData, value: string) => void;
  validationErrors: Record<string, string>;
  showPo: boolean;
  readOnly?: boolean;
}) {
  const rc = readOnly ? "opacity-70 cursor-not-allowed" : "";
  return (
    <div className="space-y-4">
      <div>
        <label className={_lblCls}>Your Invoice Reference <span className="text-destructive">*</span></label>
        {readOnly ? (
          <p className="text-sm py-2">{form.vendor_invoice_number || "—"}</p>
        ) : (
          <input
            type="text"
            value={form.vendor_invoice_number || ""}
            onChange={(e) => onChange("vendor_invoice_number", e.target.value)}
            className={`${_inputCls} ${validationErrors.vendor_invoice_number ? _errCls : ""} ${rc}`}
          />
        )}
        {validationErrors.vendor_invoice_number && <p className={_errMsgCls}>{validationErrors.vendor_invoice_number}</p>}
      </div>
      {showPo && (
        <div>
          <label className={_lblCls}>PO Number {showPo && <span className="text-destructive">*</span>}</label>
          {readOnly ? (
            <p className="text-sm py-2">{form.po_number || "—"}</p>
          ) : (
            <input
              type="text"
              value={form.po_number || ""}
              onChange={(e) => onChange("po_number", e.target.value)}
              placeholder="e.g. PO-2026-00123"
              className={`${_inputCls} ${validationErrors.po_number ? _errCls : ""}`}
            />
          )}
          {validationErrors.po_number && <p className={_errMsgCls}>{validationErrors.po_number}</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={_lblCls}>Invoice Date <span className="text-destructive">*</span></label>
          {readOnly ? (
            <p className="text-sm py-2">{form.invoice_date || "—"}</p>
          ) : (
            <input
              type="date"
              value={form.invoice_date || ""}
              onChange={(e) => onChange("invoice_date", e.target.value)}
              className={`${_inputCls} ${validationErrors.invoice_date ? _errCls : ""}`}
            />
          )}
          {validationErrors.invoice_date && <p className={_errMsgCls}>{validationErrors.invoice_date}</p>}
        </div>
        <div>
          <label className={_lblCls}>Due Date</label>
          {readOnly ? (
            <p className="text-sm py-2">{form.due_date || "—"}</p>
          ) : (
            <input type="date" value={form.due_date || ""} onChange={(e) => onChange("due_date", e.target.value)} className={_inputCls} />
          )}
        </div>
      </div>
      <div>
        <label className={_lblCls}>Currency <span className="text-destructive">*</span></label>
        {readOnly ? (
          <p className="text-sm py-2">{form.currency || "—"}</p>
        ) : (
          <input
            type="text"
            value={form.currency || ""}
            onChange={(e) => onChange("currency", e.target.value.toUpperCase())}
            maxLength={3}
            className={`${_inputCls} ${validationErrors.currency ? _errCls : ""}`}
          />
        )}
        {validationErrors.currency && <p className={_errMsgCls}>{validationErrors.currency}</p>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={_lblCls}>Subtotal</label>
          {readOnly ? (
            <p className="text-sm py-2">{form.subtotal_amount || "—"}</p>
          ) : (
            <input type="number" min="0" step="0.01" value={form.subtotal_amount || ""} onChange={(e) => onChange("subtotal_amount", e.target.value)} className={_inputCls} />
          )}
        </div>
        <div>
          <label className={_lblCls}>Tax</label>
          {readOnly ? (
            <p className="text-sm py-2">{form.tax_amount || "—"}</p>
          ) : (
            <input type="number" min="0" step="0.01" value={form.tax_amount || ""} onChange={(e) => onChange("tax_amount", e.target.value)} className={_inputCls} />
          )}
        </div>
        <div>
          <label className={_lblCls}>Total <span className="text-destructive">*</span></label>
          {readOnly ? (
            <p className="text-sm py-2 font-medium">{form.total_amount || "—"}</p>
          ) : (
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.total_amount || ""}
              onChange={(e) => onChange("total_amount", e.target.value)}
              className={`${_inputCls} ${validationErrors.total_amount ? _errCls : ""}`}
            />
          )}
          {validationErrors.total_amount && <p className={_errMsgCls}>{validationErrors.total_amount}</p>}
        </div>
      </div>
      <div>
        <label className={_lblCls}>Description / Notes</label>
        {readOnly ? (
          <p className="text-sm py-2">{form.description || "—"}</p>
        ) : (
          <textarea rows={2} value={form.description || ""} onChange={(e) => onChange("description", e.target.value)} className={`${_inputCls} resize-none`} />
        )}
      </div>
    </div>
  );
}

// ── Step: Choose mode ────────────────────────────────────────────────────────
  if (step === "choose") {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Choose Submission Method</h3>
          <p className="text-xs text-muted-foreground">Upload a file for auto-fill, or enter all details manually.</p>
        </div>

        {/* Template downloads */}
        <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Template Downloads</p>
          <div className="flex gap-3">
            <a
              href="/api/v1/invoices/vendor-invoice-submissions/template/excel/"
              download
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              Download Excel Template
            </a>
            <a
              href="/api/v1/invoices/vendor-invoice-submissions/template/pdf/"
              download
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <FileType className="w-4 h-4 text-red-500" />
              Download PDF Template
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Excel template is recommended for best auto-fill. PDF is accepted but may require manual correction.
          </p>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setStep("upload_idle")}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <Upload className="w-8 h-8 text-primary" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Upload Invoice</p>
              <p className="text-xs text-muted-foreground mt-1">PDF or Excel — fields auto-extracted</p>
            </div>
          </button>
          <button
            onClick={() => { setForm(EMPTY_FORM()); setStep("manual_idle"); }}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-secondary/20 transition-colors"
          >
            <Edit3 className="w-8 h-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Manual Entry</p>
              <p className="text-xs text-muted-foreground mt-1">Fill all fields yourself</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ── Upload path: idle ────────────────────────────────────────────────────────
  if (step === "upload_idle" || step === "uploading" || step === "extracting") {
    const busy = step === "uploading" || step === "extracting";
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <button onClick={resetAll} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-xs font-medium text-foreground">Upload Invoice</span>
        </div>

        <div>
          <label className={invoiceLblCls}>Bill To Entity</label>
          {!vendor.scope_node ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Vendor billing scope is not configured. Contact support.
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm text-foreground">
              <span>{vendor.scope_node_name || vendor.scope_node}</span>
            </div>
          )}
        </div>

        <div>
          <label className={invoiceLblCls}>Invoice File (PDF or Excel) <span className="text-destructive">*</span></label>
          <div
            className={`flex items-center gap-2 rounded-lg border ${invoiceFile ? "border-border bg-secondary/20" : "border-dashed border-border"} px-3 py-2 cursor-pointer`}
            onClick={() => !busy && document.getElementById("upload-file-input")?.click()}
          >
            <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground truncate flex-1">
              {invoiceFile ? invoiceFile.name : busy ? "Uploading…" : "Click to choose file…"}
            </span>
            {invoiceFile && (
              <button onClick={(e) => { e.stopPropagation(); setInvoiceFile(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <input id="upload-file-input" type="file" accept=".pdf,.xlsx,.xls" className="hidden"
            onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)} />
        </div>

        <div>
          <label className={invoiceLblCls}>Supporting Documents <span className="text-muted-foreground font-normal">(optional)</span></label>
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 cursor-pointer"
            onClick={() => document.getElementById("upload-supporting-input")?.click()}>
            <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate flex-1">
              {supportingFiles.length === 0 ? "Click to attach files…" : `${supportingFiles.length} file(s) selected`}
            </span>
          </div>
          <input id="upload-supporting-input" type="file" multiple accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg" className="hidden"
            onChange={(e) => setSupportingFiles(Array.from(e.target.files ?? []))} />
          {supportingFiles.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {supportingFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Paperclip className="w-3 h-3" /><span>{f.name}</span>
                  <button onClick={() => setSupportingFiles((fs) => fs.filter((_, j) => j !== i))} className="ml-auto"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          disabled={!vendor.scope_node || !invoiceFile || busy}
          onClick={handleUploadExtract}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {step === "uploading" ? "Uploading…" : "Extracting…"}</> : <><Upload className="w-4 h-4" /> Extract Details</>}
        </button>
      </div>
    );
  }

  // ── Upload path: preview ──────────────────────────────────────────────────────
  if (step === "preview") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep("upload_idle")} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-xs font-medium text-foreground">Review Invoice Details</span>
        </div>

        {Object.keys(validationErrors).length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-xs font-semibold text-destructive mb-2">Please fix the following fields:</p>
            {Object.entries(validationErrors).map(([field, msg]) => (
              <p key={field} className="text-xs text-destructive">• {msg}</p>
            ))}
          </div>
        )}

        <InvoiceFormFields form={form} onChange={handleFieldChange} validationErrors={validationErrors} showPo={vendor.po_mandate_enabled} />

        {invoiceFile && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3.5 h-3.5" /><span>{invoiceFile.name}</span>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={handleRerunExtraction} disabled={extractSub.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-60">
            {extractSub.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Re-extract
          </button>
          <button onClick={handleSubmitForReview} disabled={submitSub.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
            {submitSub.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Submit Invoice
          </button>
        </div>
      </div>
    );
  }

  // ── Manual path: idle (entity + file selection) ───────────────────────────────
  if (step === "manual_idle") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <button onClick={resetAll} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-xs font-medium text-foreground">Manual Entry</span>
        </div>

        <div>
          <label className={invoiceLblCls}>Bill To Entity</label>
          {!vendor.scope_node ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Vendor billing scope is not configured. Contact support.
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm text-foreground">
              <span>{vendor.scope_node_name || vendor.scope_node}</span>
            </div>
          )}
        </div>

        <div>
          <label className={invoiceLblCls}>Invoice File <span className="text-muted-foreground font-normal">(required before submit)</span></label>
          <div
            className={`flex items-center gap-2 rounded-lg border ${manualInvoiceFile ? "border-border bg-secondary/20" : "border-dashed border-border"} px-3 py-2 cursor-pointer`}
            onClick={() => document.getElementById("manual-file-input")?.click()}
          >
            <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground truncate flex-1">
              {manualInvoiceFile ? manualInvoiceFile.name : "Click to choose file…"}
            </span>
            {manualInvoiceFile && (
              <button onClick={(e) => { e.stopPropagation(); setManualInvoiceFile(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <input id="manual-file-input" type="file" accept=".pdf,.xlsx,.xls" className="hidden"
            onChange={(e) => setManualInvoiceFile(e.target.files?.[0] ?? null)} />
        </div>

        <div>
          <label className={invoiceLblCls}>Supporting Documents <span className="text-muted-foreground font-normal">(optional)</span></label>
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 cursor-pointer"
            onClick={() => document.getElementById("manual-supporting-input")?.click()}>
            <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate flex-1">
              {manualSupportingFiles.length === 0 ? "Click to attach files…" : `${manualSupportingFiles.length} file(s) selected`}
            </span>
          </div>
          <input id="manual-supporting-input" type="file" multiple accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg" className="hidden"
            onChange={(e) => setManualSupportingFiles(Array.from(e.target.files ?? []))} />
          {manualSupportingFiles.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {manualSupportingFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Paperclip className="w-3 h-3" /><span>{f.name}</span>
                  <button onClick={() => setManualSupportingFiles((fs) => fs.filter((_, j) => j !== i))} className="ml-auto"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          disabled={!vendor.scope_node || isBusy}
          onClick={() => { setForm(EMPTY_FORM()); setStep("manual_filling"); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors disabled:opacity-60"
        >
          <Edit3 className="w-4 h-4" /> Continue to Form
        </button>
      </div>
    );
  }

  // ── Manual path: filling form ─────────────────────────────────────────────────
  if (step === "manual_filling") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep("manual_idle")} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-xs font-medium text-foreground">Manual Entry</span>
        </div>

        {Object.keys(validationErrors).length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-xs font-semibold text-destructive mb-2">Please fix the following fields:</p>
            {Object.entries(validationErrors).map(([field, msg]) => (
              <p key={field} className="text-xs text-destructive">• {msg}</p>
            ))}
          </div>
        )}

        <InvoiceFormFields form={form} onChange={handleFieldChange} validationErrors={validationErrors} showPo={vendor.po_mandate_enabled} />

        {manualInvoiceFile && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3.5 h-3.5" /><span>{manualInvoiceFile.name}</span>
          </div>
        )}

        <button
          onClick={handleManualSubmit}
          disabled={!manualInvoiceFile || !vendor.scope_node || isBusy}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {isBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><CheckCircle2 className="w-4 h-4" /> Submit Invoice</>}
        </button>
      </div>
    );
  }

  // ── Submitted ─────────────────────────────────────────────────────────────────
  if (step === "submitted") {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-1">Invoice Submitted!</h3>
          <p className="text-sm text-muted-foreground">Your invoice has been submitted for internal review.</p>
        </div>
      </div>
    );
  }

  return null;
}

// ── Portal ─────────────────────────────────────────────────────────────────────

function Portal({ vendor, userName, onLogout }: { vendor: Vendor; userName: string; onLogout: () => void }) {
  const [tab, setTab] = useState<"invoices" | "submit">("invoices");

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader vendorName={vendor.vendor_name} userName={userName} onLogout={onLogout} />
      <div className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 flex">
          {([
            { id: "invoices", label: "My Invoices", icon: <FileText className="w-4 h-4" /> },
            { id: "submit",   label: "Submit Invoice", icon: <Upload className="w-4 h-4" /> },
          ] as const).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>
      </div>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {tab === "invoices" && <MyInvoicesTab />}
        {tab === "submit"   && <SubmitInvoiceTab vendor={vendor} />}
      </main>
    </div>
  );
}

function LoadingState({ userName, onLogout }: { userName: string; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      <PortalHeader vendorName="Vendor Portal" userName={userName} onLogout={onLogout} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading your portal…</span>
        </div>
      </main>
    </div>
  );
}

function NotConfiguredState({ userName, onLogout }: { userName: string; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      <PortalHeader vendorName="Vendor Portal" userName={userName} onLogout={onLogout} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col items-center text-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Account Not Configured</h2>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Your account has not been linked to a vendor yet. Please contact your organisation administrator to complete the setup.
            </p>
          </div>
          <div className="mt-2 p-4 rounded-xl bg-muted/40 border border-border text-left max-w-sm w-full">
            <p className="text-xs font-medium text-foreground mb-2">What your admin needs to do:</p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Ensure your vendor is registered in InvoFlow</li>
              <li>Link your user account to that vendor via Django Admin</li>
              <li>Ask you to refresh this page once done</li>
            </ul>
          </div>
          <button onClick={onLogout} className="mt-2 px-6 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">Sign Out</button>
        </div>
      </main>
    </div>
  );
}

export default function VendorPortalPage() {
  const { user, logout } = useAuth();
  const { data: vendor, isLoading, isError } = useMyVendor();
  const userName = user?.name ?? "";

  if (isLoading) return <LoadingState userName={userName} onLogout={logout} />;
  if (isError || !vendor) return <NotConfiguredState userName={userName} onLogout={logout} />;

  return <Portal vendor={vendor} userName={userName} onLogout={logout} />;
}
