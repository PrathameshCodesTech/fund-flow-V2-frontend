/**
 * VendorPortalPage — self-service portal for vendor-role users.
 *
 * Tabs:
 *   A. My Invoices      — all submitted invoices and in-progress drafts
 *   B. Submit Invoice  — upload PDF invoice only
 */

import { useEffect, useState } from "react";
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
  useVendorSendToOptions,
  useCancelSubmission,
  useAddSubmissionDocument,
  useInvoicePayment,
} from "@/lib/hooks/useV2Invoice";
import { useQuery } from "@tanstack/react-query";
import { showErrorToast, extractErrorMessage } from "@/lib/utils/toast-error";
import type { Vendor } from "@/lib/types/v2vendor";
import type {
  Invoice,
  VendorInvoiceSubmission,
  NormalizedInvoiceData,
  VendorSendToOption,
} from "@/lib/types/v2invoice";
import { ApiError } from "@/lib/api/client";
import {
  SUBMISSION_STATUS_LABELS,
  type SubmissionStatus,
} from "@/lib/types/v2invoice";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type InvoicePaymentStatus,
  type PaymentMethod,
} from "@/lib/types/invoice-payment";
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
  Ban,
  Eye,
  User,
} from "lucide-react";
import { getPortalProfile } from "@/lib/api/v2vendor";
import { listAllInvoices } from "@/lib/api/v2invoice";

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
      <div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

function validatePreSubmit(form: NormalizedInvoiceData, sendToOptionId: string, vendor: Vendor): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!sendToOptionId) errs.send_to_option_id = "Please select a Send To route.";
  if (!form.vendor_invoice_number?.trim()) errs.vendor_invoice_number = "Required";
  if (!form.invoice_date) errs.invoice_date = "Required";
  if (!form.currency?.trim()) errs.currency = "Required";
  const total = parseFloat(form.total_amount || "0") || (parseFloat(form.subtotal_amount || "0") + parseFloat(form.tax_amount || "0"));
  if (!total || total <= 0) errs.total_amount = "Must be greater than zero";
  if (vendor.po_mandate_enabled && !form.po_number?.trim()) errs.po_number = "PO number required for this vendor";
  return errs;
}

function SendToField({
  value,
  onChange,
  options,
  disabled = false,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  options: VendorSendToOption[];
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className={invoiceLblCls}>Send To <span className="text-destructive">*</span></label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${invoiceInputCls} ${error ? invoiceErrCls : ""}`}
        disabled={disabled}
      >
        <option value="">Select route...</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className={invoiceErrMsgCls}>{error}</p>}
    </div>
  );
}

// ── Status helpers ────────────────────────────────────────────────────────────

const VENDOR_DISPLAY_STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ready: {
    label: "Ready to Submit",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    color: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/40",
  },
  processing: {
    label: "Processing",
    icon: <Clock className="w-3.5 h-3.5" />,
    color: "text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/40",
  },
  action_required: {
    label: "Action Required",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    color: "text-orange-700 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/40",
  },
  paid: {
    label: "Paid",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    color: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
  },
  cancelled: {
    label: "Cancelled",
    icon: <XCircle className="w-3.5 h-3.5" />,
    color: "text-muted-foreground bg-muted",
  },
};

function getVendorDisplayStatus(status: string, paymentStatus?: InvoicePaymentStatus | null) {
  if (paymentStatus === "paid" || status === "paid") return "paid";
  if (status === "ready") return "ready";
  if (status === "needs_correction") return "action_required";
  if (status === "cancelled") return "cancelled";
  return "processing";
}

function StatusBadge({
  status,
  paymentStatus,
}: {
  status: string;
  paymentStatus?: InvoicePaymentStatus | null;
}) {
  const vendorStatus = getVendorDisplayStatus(status, paymentStatus);
  const cfg = VENDOR_DISPLAY_STATUS_CONFIG[vendorStatus] ?? VENDOR_DISPLAY_STATUS_CONFIG.processing;
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

function extractFieldErrors(err: unknown): Record<string, string> {
  const apiErr = (err as { errors?: unknown })?.errors;
  const fieldErrors: Record<string, string> = {};
  if (apiErr && typeof apiErr === "object" && !Array.isArray(apiErr)) {
    for (const [field, msgs] of Object.entries(apiErr as Record<string, unknown>)) {
      if (Array.isArray(msgs) && msgs.length > 0) {
        fieldErrors[field] = String(msgs[0]);
      }
    }
  }
  return fieldErrors;
}

// ── Portal header ─────────────────────────────────────────────────────────────

function PortalHeader({ vendorName, userName, onLogout }: { vendorName: string; userName: string; onLogout: () => void }) {
  return (
    <header className="sticky top-0 z-20 bg-card border-b border-border px-4 sm:px-8 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        {/* Brand + vendor info */}
        <div className="flex items-center gap-4 min-w-0">
          {/* VIMS logo */}
          <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-border">
            <img src="/vims-brand.png" alt="VIMS" className="h-9 w-auto object-contain" />
            <span className="hidden sm:block text-base font-extrabold text-primary tracking-tight">VIMS</span>
          </div>
          {/* Vendor identity */}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{vendorName || "Vendor Portal"}</p>
            {userName && <p className="text-xs text-muted-foreground truncate">{userName}</p>}
          </div>
        </div>
        {/* Sign out */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">Sign out</span>
        </button>
      </div>
    </header>
  );
}

// ── My Invoices tab ───────────────────────────────────────────────────────────

function MyInvoicesTab() {
  const PAGE_SIZE = 8;
  const [page, setPage] = useState(1);
  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ["v2", "vendor-portal", "all-invoices"],
    queryFn: () => listAllInvoices(),
  });
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

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedRows = rows.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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
      {!isLoading && pagedRows.map((row) =>
        row.kind === "invoice"
          ? <InvoiceRow key={`inv-${row.data.id}`} invoice={row.data} />
          : <SubmissionRow key={`sub-${row.data.id}`} submission={row.data} onClick={() => setSelectedSubmission(row.data)} />
      )}

      {!isLoading && rows.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, rows.length)} of {rows.length}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1;
              const isActive = pageNumber === currentPage;
              return (
                <button
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  className={`min-w-9 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Next
            </button>
          </div>
        </div>
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
  const { data: payment } = useInvoicePayment(expanded ? invoice.id : null);

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
          <StatusBadge status={invoice.status} paymentStatus={payment?.payment_status} />
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
            <div><span className="text-muted-foreground block mb-0.5">Created</span><span className="font-medium">{fmtDate(invoice.created_at)}</span></div>
            <div><span className="text-muted-foreground block mb-0.5">Currency</span><span className="font-medium">{invoice.currency}</span></div>
            <div><span className="text-muted-foreground block mb-0.5">Amount</span><span className="font-medium">{fmtAmount(invoice.amount, invoice.currency)}</span></div>
          </div>

          {payment && (
            <div className="rounded-lg border border-purple-200 bg-purple-50/60 dark:border-purple-800 dark:bg-purple-950/30 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-purple-900 dark:text-purple-100 mb-1.5">Payment Details</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div><span className="text-muted-foreground">Status</span></div>
                <div><span className="font-medium">{PAYMENT_STATUS_LABELS[payment.payment_status]}</span></div>
                {payment.payment_method && (
                  <>
                    <div><span className="text-muted-foreground">Method</span></div>
                    <div><span className="font-medium">{PAYMENT_METHOD_LABELS[payment.payment_method as PaymentMethod] ?? payment.payment_method}</span></div>
                  </>
                )}
                {payment.paid_amount && (
                  <>
                    <div><span className="text-muted-foreground">Amount Paid</span></div>
                    <div><span className="font-medium">{payment.currency} {parseFloat(payment.paid_amount).toLocaleString()}</span></div>
                  </>
                )}
                {payment.payment_date && (
                  <>
                    <div><span className="text-muted-foreground">Payment Date</span></div>
                    <div><span className="font-medium">{fmtDate(payment.payment_date)}</span></div>
                  </>
                )}
                {payment.payment_reference_number && (
                  <>
                    <div><span className="text-muted-foreground">Ref Number</span></div>
                    <div><span className="font-medium font-mono text-xs">{payment.payment_reference_number}</span></div>
                  </>
                )}
                {payment.utr_number && (
                  <>
                    <div><span className="text-muted-foreground">UTR Number</span></div>
                    <div><span className="font-medium font-mono text-xs">{payment.utr_number}</span></div>
                  </>
                )}
                {payment.remarks && (
                  <>
                    <div><span className="text-muted-foreground">Remarks</span></div>
                    <div><span className="font-medium">{payment.remarks}</span></div>
                  </>
                )}
              </div>
            </div>
          )}
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
            {submission.status === "needs_correction" && submission.correction_note && (
              <p className="text-xs text-orange-700 truncate mt-0.5">{submission.correction_note}</p>
            )}
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
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateSub = useUpdateSubmissionFields();
  const extractSub = useExtractSubmission();
  const submitSub = useSubmitSubmission();
  const { data: sendToOptions = [] } = useVendorSendToOptions();
  const cancelSub = useCancelSubmission();
  const [sendToOptionId, setSendToOptionId] = useState<string>("");

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
    setSubmitError(null);
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
    if (!sendToOptionId) {
      setValidationErrors((prev) => ({ ...prev, send_to_option_id: "Please select a Send To route." }));
      setSubmitError("Please select a Send To route.");
      return;
    }
    try {
      await updateSub.mutateAsync({ id: submission.id, data: { normalized_data: form } });
      await submitSub.mutateAsync({
        id: submission.id,
        data: { send_to_option_id: Number(sendToOptionId) },
      });
      setSuccessMsg("Invoice submitted for review.");
      setSubmitError(null);
      setTimeout(() => { onUpdated(); onClose(); }, 1500);
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to submit. Please try again.");
      const fieldErrors = extractFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setValidationErrors((prev) => ({ ...prev, ...fieldErrors }));
        setSubmitError(msg);
        showErrorToast(msg);
      } else {
        setSubmitError(msg);
        showErrorToast(msg);
      }
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
  const workflowValidationMessage =
    submission.validation_errors?.find((e) => e.field === "_workflow")?.message || "";
  const correctionReason = submission.correction_note || workflowValidationMessage || validationErrors._workflow || "";

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
          {isNeedsCorrection && correctionReason && (
            <div className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2.5">
              <p className="text-xs font-semibold text-orange-800 mb-1">Returned for correction</p>
              <p className="text-sm text-orange-900">{correctionReason}</p>
              {(submission.correction_requested_by_name || submission.correction_requested_at) && (
                <p className="text-xs text-orange-700 mt-1">
                  {submission.correction_requested_by_name ? `By ${submission.correction_requested_by_name}` : "Returned during internal review"}
                  {submission.correction_requested_at ? ` on ${fmtDate(submission.correction_requested_at)}` : ""}
                </p>
              )}
            </div>
          )}
          {successMsg && (
            <div className="rounded-lg bg-green-50 text-green-700 text-sm px-3 py-2">{successMsg}</div>
          )}
          {submitError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5">
              <p className="text-sm font-medium text-destructive">{submitError}</p>
            </div>
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

          {!isReadOnly && (
            <SendToField
              value={sendToOptionId}
              onChange={setSendToOptionId}
              options={sendToOptions}
              disabled={isBusy}
              error={validationErrors.send_to_option_id}
            />
          )}

          {/* Warnings */}
          {submitSub.data?.warnings && submitSub.data.warnings.length > 0 && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950 px-4 py-3">
              <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 mb-1">Warnings</p>
              {submitSub.data.warnings.map((w, i) => (
                <p key={i} className="text-xs text-yellow-600 dark:text-yellow-500">{w.message}</p>
              ))}
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

type Step = "choose" | "upload_idle" | "uploading" | "extracting" | "preview" | "submitted";

function SubmitInvoiceTab({ vendor }: { vendor: Vendor }) {
  const [step, setStep] = useState<Step>("choose");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<NormalizedInvoiceData>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [scopeNode] = useState(vendor.scope_node || "");
  // Upload path state
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);

  const [form, setForm] = useState<NormalizedInvoiceData>(EMPTY_FORM());

  const createSub = useCreateSubmission();
  const extractSub = useExtractSubmission();
  const updateSub = useUpdateSubmissionFields();
  const submitSub = useSubmitSubmission();
  const addDoc = useAddSubmissionDocument();
  const { data: sendToOptions = [] } = useVendorSendToOptions();
  const [sendToOptionId, setSendToOptionId] = useState<string>("");

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
    setSendToOptionId("");
    setSuccessMsg(null);
    setSubmitError(null);
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
    setSubmitError(null);
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
      setSubmitError(null);
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
      const msg = extractErrorMessage(err, "Failed to upload invoice. Please try again.");
      setSubmitError(msg);
      showErrorToast(msg);
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
      const msg = extractErrorMessage(err, "Failed to re-extract. Please fill in details manually.");
      setSubmitError(msg);
      showErrorToast(msg);
      setStep("preview");
    }
  }

  async function handleSubmitForReview() {
    if (!submissionId) return;
    const preErrors = validatePreSubmit(form, sendToOptionId, vendor);
    if (Object.keys(preErrors).length > 0) {
      setValidationErrors(preErrors);
      setSubmitError("Please fix the highlighted invoice fields before submitting.");
      return;
    }
    try {
      await updateSub.mutateAsync({ id: submissionId, data: { normalized_data: form } });
      const result = await submitSub.mutateAsync({
        id: submissionId,
        data: { send_to_option_id: Number(sendToOptionId) },
      });
      if (result?.warnings?.length) {
        setSuccessMsg("Invoice submitted for review.");
      }
      setSubmitError(null);
      setStep("submitted");
      setTimeout(resetAll, 3000);
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to submit invoice. Please try again.");
      const apiErr = (err as any)?.errors;
      const fieldErrors: Record<string, string> = {};
      if (apiErr && typeof apiErr === "object" && !Array.isArray(apiErr)) {
        for (const [field, msgs] of Object.entries(apiErr as Record<string, unknown>)) {
          if (Array.isArray(msgs) && msgs.length > 0) {
            fieldErrors[field] = String(msgs[0]);
          }
        }
      }
      if (Object.keys(fieldErrors).length > 0) {
        setValidationErrors(fieldErrors);
        setSubmitError(msg);
        showErrorToast(msg);
      } else {
        setSubmitError(msg);
        showErrorToast(msg);
      }
    }
  }

// ── Step: Choose mode ────────────────────────────────────────────────────────
  if (step === "choose") {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Submit Invoice</h3>
          <p className="text-xs text-muted-foreground">Upload your invoice PDF to extract the details and submit it for review.</p>
        </div>

        <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Template Download</p>
          <div className="space-y-1.5">
            <p className="text-sm text-foreground">
              For the best extraction result, submit the invoice in this format.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Keep the invoice reference, PO number, invoice date, due date, currency, subtotal, tax, total, and description clearly visible in the PDF.
              Using the template helps the system read these fields more accurately.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              After extraction, you can review and correct any field before final submission.
            </p>
          </div>
          <a
            href="/api/v1/invoices/vendor-invoice-submissions/template/pdf/"
            download
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
          >
            <Download className="w-4 h-4 text-red-500" />
            Download PDF Template
          </a>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => setStep("upload_idle")}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <Upload className="w-8 h-8 text-primary" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Upload Invoice PDF</p>
              <p className="text-xs text-muted-foreground mt-1">PDF only — fields auto-extracted</p>
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
          <label className={invoiceLblCls}>Invoice File (PDF) <span className="text-destructive">*</span></label>
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
          <input id="upload-file-input" type="file" accept=".pdf" className="hidden"
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
          <input id="upload-supporting-input" type="file" multiple accept=".pdf" className="hidden"
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

        <SendToField
          value={sendToOptionId}
          onChange={(nextValue) => {
            setSendToOptionId(nextValue);
            setValidationErrors((current) => {
              if (!current.send_to_option_id) return current;
              const nextErrors = { ...current };
              delete nextErrors.send_to_option_id;
              return nextErrors;
            });
          }}
          options={sendToOptions}
          disabled={submitSub.isPending}
          error={validationErrors.send_to_option_id}
        />

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

// ── My Profile tab ────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  vendor_name: "Vendor Name", email: "Email", phone: "Phone",
  title: "Title", vendor_type: "Vendor Type", fax: "Fax", region: "Region",
  head_office_no: "Head Office No", gst_registered: "GST Registered",
  address_line1: "Address Line 1", address_line2: "Address Line 2",
  address_line3: "Address Line 3", city: "City", state: "State",
  country: "Country", pincode: "Pincode", gstin: "GSTIN", pan: "PAN",
  preferred_payment_mode: "Preferred Payment Mode",
  bank_name: "Bank Name", account_number: "Account Number", ifsc: "IFSC",
  beneficiary_name: "Beneficiary Name", bank_account_type: "Account Type",
  micr_code: "MICR Code", neft_code: "NEFT Code",
  bank_branch_address_line1: "Bank Branch Address Line 1",
  bank_branch_address_line2: "Bank Branch Address Line 2",
  bank_branch_city: "Bank Branch City",
  bank_branch_state: "Bank Branch State",
  bank_branch_country: "Bank Branch Country",
  bank_branch_pincode: "Bank Branch Pincode",
  bank_phone: "Bank Phone",
  bank_fax: "Bank Fax",
  authorized_signatory_name: "Authorized Signatory Name",
  msme_registered: "MSME Registered",
  msme_registration_number: "MSME Registration Number",
  msme_enterprise_type: "MSME Enterprise Type",
  declaration_accepted: "Declaration Accepted",
};

const PROFILE_SECTIONS: Array<{ title: string; fields: string[] }> = [
  {
    title: "Business Details",
    fields: [
      "title",
      "vendor_name",
      "vendor_type",
      "email",
      "phone",
      "fax",
      "region",
      "head_office_no",
    ],
  },
  {
    title: "Tax Details",
    fields: ["gst_registered", "gstin", "pan"],
  },
  {
    title: "Billing Address",
    fields: [
      "address_line1",
      "address_line2",
      "address_line3",
      "city",
      "state",
      "country",
      "pincode",
    ],
  },
  {
    title: "Payment Details",
    fields: [
      "preferred_payment_mode",
      "beneficiary_name",
      "bank_name",
      "account_number",
      "bank_account_type",
      "ifsc",
      "micr_code",
      "neft_code",
    ],
  },
  {
    title: "Bank Branch Details",
    fields: [
      "bank_branch_address_line1",
      "bank_branch_address_line2",
      "bank_branch_city",
      "bank_branch_state",
      "bank_branch_country",
      "bank_branch_pincode",
      "bank_phone",
      "bank_fax",
    ],
  },
  {
    title: "Compliance",
    fields: [
      "authorized_signatory_name",
      "msme_registered",
      "msme_registration_number",
      "msme_enterprise_type",
      "declaration_accepted",
    ],
  },
];

function formatProfileValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function ProfileField({ label, value }: { label: string; value: unknown }) {
  const display = formatProfileValue(value);
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-medium ${display === "—" ? "text-muted-foreground/50" : "text-foreground"}`}>
        {display}
      </p>
    </div>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/40">
        <h3 className="text-xs font-semibold text-foreground tracking-wide uppercase">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MyProfileTab({ vendor: _vendor }: { vendor: Vendor }) {
  const profileQ = useQuery({
    queryKey: ["portal-profile"],
    queryFn: getPortalProfile,
  });

  const snapshot = profileQ.data?.snapshot ?? {};

  if (profileQ.isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading profile…</span>
      </div>
    );
  }

  const contactPersons = Array.isArray(snapshot.contact_persons_json) ? snapshot.contact_persons_json : [];
  const headOffice = (snapshot.head_office_address_json ?? {}) as Record<string, unknown>;
  const taxRegistration = (snapshot.tax_registration_details_json ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-4">
      {/* Notice */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Profile Details</p>
        <p className="text-xs text-muted-foreground">
          For updates, contact the internal support team.
        </p>
      </div>

      {/* Standard sections */}
      {PROFILE_SECTIONS.map((section) => (
        <ProfileSection key={section.title} title={section.title}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
            {section.fields.map((key) => (
              <ProfileField key={key} label={FIELD_LABELS[key] ?? key} value={snapshot[key]} />
            ))}
          </div>
        </ProfileSection>
      ))}

      {/* Contact Persons */}
      <ProfileSection title="Contact Persons">
        {contactPersons.length > 0 ? (
          <div className="space-y-3">
            {contactPersons.map((person, idx) => {
              const cp = person as Record<string, unknown>;
              return (
                <div key={idx} className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                    {["type", "name", "designation", "email", "telephone"].map((key) => (
                      <ProfileField key={key} label={FIELD_LABELS[key] ?? key} value={cp[key]} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/50">—</p>
        )}
      </ProfileSection>

      {/* Head Office */}
      <ProfileSection title="Head Office Address">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          {["address_line1", "address_line2", "city", "state", "country", "pincode", "phone", "fax"].map((key) => (
            <ProfileField key={key} label={FIELD_LABELS[key] ?? key} value={headOffice[key]} />
          ))}
        </div>
      </ProfileSection>

      {/* Tax Registration */}
      <ProfileSection title="Tax Registration Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          {["tax_registration_nos", "tin_no", "cst_no", "lst_no", "esic_reg_no", "pan_ref_no", "ppf_no"].map((key) => (
            <ProfileField key={key} label={FIELD_LABELS[key] ?? key} value={taxRegistration[key]} />
          ))}
        </div>
      </ProfileSection>
    </div>
  );
}


// ── Portal ─────────────────────────────────────────────────────────────────────

function Portal({ vendor, userName, onLogout }: { vendor: Vendor; userName: string; onLogout: () => void }) {
  const [tab, setTab] = useState<"invoices" | "submit" | "profile">("invoices");

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader vendorName={vendor.vendor_name} userName={userName} onLogout={onLogout} />

      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex">
          {([
            { id: "invoices", label: "My Invoices", icon: <FileText className="w-4 h-4" /> },
            { id: "submit",   label: "Submit Invoice", icon: <Upload className="w-4 h-4" /> },
            { id: "profile",  label: "My Profile", icon: <User className="w-4 h-4" /> },
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {tab === "invoices" && <MyInvoicesTab />}
        {tab === "submit"   && <SubmitInvoiceTab vendor={vendor} />}
        {tab === "profile"  && <MyProfileTab vendor={vendor} />}
      </main>
    </div>
  );
}

function LoadingState({ userName, onLogout }: { userName: string; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      <PortalHeader vendorName="Vendor Portal" userName={userName} onLogout={onLogout} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 flex items-center justify-center">
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
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
              <li>Ensure your vendor is registered in VIMS</li>
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


