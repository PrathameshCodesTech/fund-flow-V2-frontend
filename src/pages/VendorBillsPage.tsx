 import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Edit2,
  Eye,
  FileSpreadsheet,
  Link,
  Loader2,
  Plus,
  Search,
  Send,
  Split,
  Trash2,
  Upload,
  UserCog,
  X,
  XCircle,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ExportDialog } from "@/components/ExportDialog";
import { AllocationEditor } from "@/components/invoice/AllocationEditor";
import { EditInvoiceDialog } from "@/components/invoice/EditInvoiceDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  canCancelInvoice,
  canCreateInvoice,
  canEditDraftInvoice,
  canManageInvoice,
  canRejectWorkflow,
  canReviewInvoice,
  canSubmitInvoice,
} from "@/lib/capabilities";
import { ApiError } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateInvoice,
  useInvoice,
  useInvoices,
  useCancelInvoice,
  useSubmitInvoice,
} from "@/lib/hooks/useInvoices";
import {
  useApproveWorkflowStep,
  useRejectWorkflowStep,
  useReassignWorkflowStep,
} from "@/lib/hooks/useWorkflowTasks";
import { tenantAdminApi } from "@/lib/api/tenantAdmin";
import { AttachWorkflowDialog } from "@/components/workflow/AttachWorkflowDialog";
import { ReassignDialog } from "@/components/workflow/ReassignDialog";
import { useQuery } from "@tanstack/react-query";
import { extractErrorMessage, showErrorToast } from "@/lib/utils/toast-error";
import { useLegalEntities, useOrganizations } from "@/lib/hooks/useOrganizations";
import { useVendors } from "@/lib/hooks/useVendors";
import type {
  InvoiceCreatePayload,
  InvoiceDetail,
  InvoiceListItem,
  InvoiceStatus,
} from "@/lib/types/invoices";
import type { Vendor } from "@/lib/types/vendors";

type BillsFilter = "All" | "Draft" | "Pending" | "In Review" | "Approved" | "Paid" | "Rejected";

const BILL_FILTERS: BillsFilter[] = [
  "All",
  "Draft",
  "Pending",
  "In Review",
  "Approved",
  "Paid",
  "Rejected",
];

const statusConfig: Record<
  InvoiceStatus,
  {
    className: string;
    icon: typeof Clock;
    label: string;
    filter: Exclude<BillsFilter, "All"> | null;
  }
> = {
  draft: { className: "status-pending", icon: Clock, label: "Draft", filter: "Draft" },
  submitted: { className: "status-pending", icon: Clock, label: "Submitted", filter: "Pending" },
  marketing_review: {
    className: "status-review",
    icon: Eye,
    label: "Marketing Review",
    filter: "In Review",
  },
  under_review: {
    className: "status-review",
    icon: Eye,
    label: "Under Review",
    filter: "In Review",
  },
  pending_approval: {
    className: "status-pending",
    icon: Clock,
    label: "Pending Approval",
    filter: "Pending",
  },
  approved: { className: "status-approved", icon: CheckCircle2, label: "Approved", filter: "Approved" },
  rejected: { className: "status-rejected", icon: XCircle, label: "Rejected", filter: "Rejected" },
  returned_to_vendor: {
    className: "status-pending",
    icon: AlertCircle,
    label: "Returned to Vendor",
    filter: "Pending",
  },
  pending_payment: {
    className: "status-review",
    icon: Clock,
    label: "Pending Payment",
    filter: "Approved",
  },
  paid: { className: "status-approved", icon: CheckCircle2, label: "Paid", filter: "Paid" },
  cancelled: { className: "status-rejected", icon: XCircle, label: "Cancelled", filter: null },
  on_hold: { className: "status-pending", icon: AlertTriangle, label: "On Hold", filter: "Pending" },
};

const emptyForm = {
  invoiceNo: "",
  vendor: "",
  date: "",
  baseAmount: "",
  gstPct: "18",
  campaign: "",
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function formatCurrency(value: string | number, currency = "INR"): string {
  const amount = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(amount)) {
    return currency;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function matchesInvoiceFilter(status: InvoiceStatus, filter: BillsFilter): boolean {
  if (filter === "All") {
    return true;
  }

  return statusConfig[status].filter === filter;
}

function parseCSV(text: string): Partial<typeof emptyForm> {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) {
    return {};
  }

  const headers = lines[0]
    .split(",")
    .map((header) => header.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  const values = lines[1].split(",").map((value) => value.trim().replace(/^"|"$/g, ""));

  const getValue = (...keys: string[]) => {
    for (const key of keys) {
      const index = headers.findIndex((header) => header.includes(key));
      if (index !== -1) {
        return values[index] || "";
      }
    }
    return "";
  };

  return {
    invoiceNo: getValue("invoiceno", "invoice", "invno"),
    vendor: getValue("vendor", "vendorname", "company"),
    date: getValue("date", "invoicedate"),
    baseAmount: getValue("baseamount", "amount", "base"),
    gstPct: getValue("gstpct", "gstrate", "gst"),
    campaign: getValue("campaign"),
  };
}

interface UploadInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: InvoiceCreatePayload) => Promise<InvoiceDetail>;
  isCreating: boolean;
  vendors: Vendor[];
  vendorsLoading: boolean;
  defaultOrganizationId: string | null;
  defaultLegalEntityId: string | null;
}

function UploadInvoiceDialog({
  open,
  onClose,
  onCreate,
  isCreating,
  vendors,
  vendorsLoading,
  defaultOrganizationId,
  defaultLegalEntityId,
}: UploadInvoiceDialogProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "form">("upload");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(defaultOrganizationId ?? "");
  const [selectedLegalEntityId, setSelectedLegalEntityId] = useState(defaultLegalEntityId ?? "");
  const {
    data: organizations = [],
    isLoading: organizationsLoading,
    error: organizationsError,
  } = useOrganizations();
  const {
    data: legalEntities = [],
    isLoading: legalEntitiesLoading,
    error: legalEntitiesError,
  } = useLegalEntities(
    selectedOrganizationId || undefined,
  );

  const baseNum = Number.parseFloat(form.baseAmount.replace(/[^0-9.]/g, "")) || 0;
  const gstNum = Math.round(baseNum * (Number.parseFloat(form.gstPct || "0") / 100) * 100) / 100;
  const totalNum = baseNum + gstNum;
  const selectedVendors = selectedOrganizationId
    ? vendors.filter((vendor) => vendor.organization === selectedOrganizationId)
    : vendors;

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedOrganizationId(defaultOrganizationId ?? "");
    setSelectedLegalEntityId(defaultLegalEntityId ?? "");
  }, [defaultLegalEntityId, defaultOrganizationId, open]);

  useEffect(() => {
    if (!selectedLegalEntityId) {
      return;
    }

    const stillValid = legalEntities.some((entity) => entity.id === selectedLegalEntityId);
    if (!stillValid) {
      setSelectedLegalEntityId("");
    }
  }, [legalEntities, selectedLegalEntityId]);

  const reset = () => {
    setDragging(false);
    setFileName(null);
    setForm(emptyForm);
    setErrors({});
    setGeneralError(null);
    setStep("upload");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const setField = (key: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setGeneralError(null);
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "csv") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const parsed = parseCSV(String(event.target?.result ?? ""));
        setForm((current) => ({ ...current, ...parsed }));
      };
      reader.readAsText(file);
    }
    setStep("form");
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.invoiceNo.trim()) {
      nextErrors.invoiceNo = "Invoice number is required";
    }
    if (!form.vendor.trim()) {
      nextErrors.vendor = "Vendor is required";
    }
    if (!form.date.trim()) {
      nextErrors.date = "Invoice date is required";
    }
    if (!form.baseAmount.trim() || baseNum <= 0) {
      nextErrors.baseAmount = "Enter a valid base amount";
    }
    if (!selectedOrganizationId) {
      nextErrors.organization = "Organization is required";
    }
    if (!selectedLegalEntityId) {
      nextErrors.legal_entity = "Legal entity is required";
    }

    return nextErrors;
  };

  const findVendorMatch = (input: string): Vendor | undefined => {
    const needle = input.trim().toLowerCase();
    return selectedVendors.find((vendor) => {
      return [vendor.name, vendor.legal_name, vendor.code]
        .filter(Boolean)
        .some((value) => value.toLowerCase() === needle);
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const vendor = findVendorMatch(form.vendor);
    if (!vendor) {
      setErrors((current) => ({
        ...current,
        vendor: "Enter an existing vendor name, legal name, or code from your organization.",
      }));
      return;
    }

    try {
      await onCreate({
        organization: selectedOrganizationId,
        legal_entity: selectedLegalEntityId,
        vendor: vendor.id,
        vendor_invoice_number: form.invoiceNo.trim(),
        invoice_date: form.date,
        currency: "INR",
        subtotal_amount: baseNum.toFixed(2),
        tax_amount: gstNum.toFixed(2),
        total_amount: totalNum.toFixed(2),
        description: form.campaign.trim() ? `Campaign: ${form.campaign.trim()}` : "",
      });
      handleClose();
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(error.errors)) {
          const firstMessage = messages[0];
          if (!firstMessage) {
            continue;
          }

          if (field === "vendor_invoice_number" || field === "invoice_number") {
            fieldErrors.invoiceNo = firstMessage;
            continue;
          }

          fieldErrors[field] = firstMessage;
        }

        if (Object.keys(fieldErrors).length > 0) {
          setErrors((current) => ({ ...current, ...fieldErrors }));
        }

        const nonFieldError =
          error.errors.detail?.[0] ??
          error.errors.non_field_errors?.[0] ??
          null;
        if (nonFieldError) {
          toast({ title: "Error", description: nonFieldError, variant: "destructive" });
        }
        return;
      }

      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={handleClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Upload Invoice</h2>
            {fileName && <p className="mt-0.5 text-[11px] text-muted-foreground">{fileName}</p>}
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === "upload" ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                className="hidden"
                onChange={(event) => {
                  if (event.target.files?.[0]) {
                    handleFile(event.target.files[0]);
                  }
                }}
              />
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  const file = event.dataTransfer.files[0];
                  if (file) {
                    handleFile(file);
                  }
                }}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed py-14 text-center transition-colors ${
                  dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <Upload className="mx-auto mb-3 h-10 w-10 text-primary" />
                <p className="text-sm font-medium text-foreground">Drop your invoice file here</p>
                <p className="mt-1 text-caption">or click to browse</p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  {["Excel", "CSV", "PDF"].map((label) => (
                    <span
                      key={label}
                      className="flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[11px] text-muted-foreground"
                    >
                      <FileSpreadsheet className="h-3 w-3" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or enter manually</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                onClick={() => setStep("form")}
                className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Fill in details manually
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Invoice No *
                    </label>
                    <input
                      value={form.invoiceNo}
                      onChange={(event) => setField("invoiceNo", event.target.value)}
                      placeholder="INV-2025-001"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {errors.invoiceNo && (
                      <p className="mt-1 text-[11px] text-destructive">{errors.invoiceNo}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Vendor *
                    </label>
                    <input
                      list="invoice-vendors"
                      value={form.vendor}
                      onChange={(event) => setField("vendor", event.target.value)}
                      placeholder="Start typing a vendor"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <datalist id="invoice-vendors">
                      {selectedVendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.name} />
                      ))}
                    </datalist>
                    {errors.vendor && (
                      <p className="mt-1 text-[11px] text-destructive">{errors.vendor}</p>
                    )}
                    {!errors.vendor && !vendorsLoading && selectedOrganizationId && selectedVendors.length === 0 && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        No vendors are available for the selected organization.
                      </p>
                    )}
                    {!errors.vendor && vendorsLoading && (
                      <p className="mt-1 text-[11px] text-muted-foreground">Loading vendors…</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => setField("date", event.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {errors.date && <p className="mt-1 text-[11px] text-destructive">{errors.date}</p>}
                </div>

                {!defaultOrganizationId && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Organization *
                    </label>
                    <select
                      value={selectedOrganizationId}
                      onChange={(event) => {
                        setSelectedOrganizationId(event.target.value);
                        setSelectedLegalEntityId("");
                        setErrors((current) => ({
                          ...current,
                          organization: "",
                          legal_entity: "",
                          vendor: "",
                        }));
                      }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">
                        {organizationsLoading ? "Loading organizations..." : "Select organization"}
                      </option>
                      {organizations.map((organization) => (
                        <option key={organization.id} value={organization.id}>
                          {organization.name}
                        </option>
                      ))}
                    </select>
                    {errors.organization && (
                      <p className="mt-1 text-[11px] text-destructive">{errors.organization}</p>
                    )}
                    {!errors.organization && organizationsError && (
                      <p className="mt-1 text-[11px] text-destructive">
                        {getErrorMessage(organizationsError, "Unable to load organizations.")}
                      </p>
                    )}
                  </div>
                )}

                {!defaultLegalEntityId && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Legal Entity *
                    </label>
                    <select
                      value={selectedLegalEntityId}
                      disabled={!selectedOrganizationId || legalEntitiesLoading}
                      onChange={(event) => {
                        setSelectedLegalEntityId(event.target.value);
                        setErrors((current) => ({ ...current, legal_entity: "" }));
                      }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">
                        {!selectedOrganizationId
                          ? "Select organization first"
                          : legalEntitiesLoading
                          ? "Loading legal entities..."
                          : "Select legal entity"}
                      </option>
                      {legalEntities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.name}
                        </option>
                      ))}
                    </select>
                    {errors.legal_entity && (
                      <p className="mt-1 text-[11px] text-destructive">{errors.legal_entity}</p>
                    )}
                    {!errors.legal_entity && legalEntitiesError && (
                      <p className="mt-1 text-[11px] text-destructive">
                        {getErrorMessage(legalEntitiesError, "Unable to load legal entities.")}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Base Amount *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.baseAmount}
                      onChange={(event) => setField("baseAmount", event.target.value)}
                      placeholder="381356"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {errors.baseAmount && (
                      <p className="mt-1 text-[11px] text-destructive">{errors.baseAmount}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      GST Rate (%)
                    </label>
                    <select
                      value={form.gstPct}
                      onChange={(event) => setField("gstPct", event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {["0", "5", "12", "18", "28"].map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}%
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {baseNum > 0 && (
                  <div className="grid grid-cols-3 gap-3 rounded-xl bg-secondary/50 p-3">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Base</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(baseNum, "INR")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">GST</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(gstNum, "INR")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Total</p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(totalNum, "INR")}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Campaign <span className="opacity-60">(optional)</span>
                  </label>
                  <input
                    value={form.campaign}
                    onChange={(event) => setField("campaign", event.target.value)}
                    placeholder="e.g. Q4 Digital Push"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="rounded-xl border border-border/70 bg-secondary/30 px-3 py-2.5 text-xs text-muted-foreground">
                  Invoice will be saved as draft. Add allocation lines and submit from the invoice detail view.
                </div>

                {generalError && (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    {generalError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep("upload")}
                    className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Create Draft Invoice"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function DetailMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

/** States treated as "draft" for header edit and allocation edit. */
const DRAFT_STATES: InvoiceStatus[] = ["draft"];
/** States treated as editable by internal users (marketing edits allocations here). */
const MARKETING_EDITABLE_STATES: InvoiceStatus[] = ["marketing_review"];
const CANCELLABLE_STATES: InvoiceStatus[] = ["draft", "on_hold"];
/** States where a reviewer REVIEW step can be approved (forward) or rejected (return to vendor). */
const REVIEW_STEP_ACTIVE_STATES: InvoiceStatus[] = ["marketing_review"];

interface InvoiceDetailContentProps {
  detail: InvoiceDetail;
  onEditOpen: () => void;
}

function InvoiceDetailContent({ detail, onEditOpen }: InvoiceDetailContentProps) {
  const { user } = useAuth();
  const { cancelInvoice, isCancelling, cancelError } = useCancelInvoice();
  const { approve, isApproving } = useApproveWorkflowStep();
  const { reject: rejectStepFn, isRejecting } = useRejectWorkflowStep();
  const { reassign, isReassigning } = useReassignWorkflowStep();
  const [attachWorkflowOpen, setAttachWorkflowOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelGeneralError, setCancelGeneralError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnGeneralError, setReturnGeneralError] = useState<string | null>(null);
  const [returnSuccess, setReturnSuccess] = useState(false);
  const [forwardSuccess, setForwardSuccess] = useState(false);
  const [forwardGeneralError, setForwardGeneralError] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectGeneralError, setRejectGeneralError] = useState<string | null>(null);
  const [rejectSuccess, setRejectSuccess] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignSuccess, setReassignSuccess] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  const isDraft = DRAFT_STATES.includes(detail.status);
  const isMarketingEditable = MARKETING_EDITABLE_STATES.includes(detail.status);
  const isCancellable = CANCELLABLE_STATES.includes(detail.status);
  const userCanEdit = canEditDraftInvoice(user) && isDraft;
  const userCanManage = canManageInvoice(user);
  const userCanEditAsReviewer = canReviewInvoice(user) && isMarketingEditable;
  const userCanCancel = canCancelInvoice(user) && isCancellable;

  // Reviewer actions via workflow step approve/reject (template-driven)
  const reviewStep = detail.current_workflow_step;
  const hasActiveReviewStep = reviewStep?.step_type === "review" && REVIEW_STEP_ACTIVE_STATES.includes(detail.status);
  const hasActiveApprovalStep = reviewStep?.step_type === "approval" && ["under_review", "pending_approval"].includes(detail.status);
  const userCanForward = canReviewInvoice(user) && hasActiveReviewStep;
  // Hide return-to-vendor when version explicitly has no vendor return node
  const versionSupportsVendorReturn = detail.attached_workflow_version?.has_vendor_return_node !== false;
  const userCanReturn = canReviewInvoice(user) && hasActiveReviewStep && versionSupportsVendorReturn;
  // Attach workflow — visible to manage-capable users when invoice is submitted and not yet linked
  const userCanAttachWorkflow = canManageInvoice(user) && detail.status === "submitted" && !detail.attached_workflow_version;
  const userCanRejectToMarketing = canRejectWorkflow(user) && hasActiveApprovalStep;
  // Reassignment requires the same approve capability; backend also checks current assignee or staff
  const userCanReassign = canRejectWorkflow(user) && !!reviewStep?.id;

  const handleForwardToHO = async () => {
    if (!reviewStep) return;
    setForwardGeneralError(null);
    try {
      await approve({ stepId: reviewStep.id });
      setForwardSuccess(true);
    } catch (err) {
      const message = extractErrorMessage(err, "Failed to forward invoice.");
      setForwardGeneralError(message);
      showErrorToast(message, "Invoice action failed");
    }
  };

  const handleCancelClick = () => {
    setCancelModalOpen(true);
    setCancelReason("");
    setCancelGeneralError(null);
  };

  const handleReassign = async (assignee: string, comment: string) => {
    if (!reviewStep) return;
    setReassignError(null);
    try {
      await reassign({ stepId: reviewStep.id, assignee, comment });
      setReassignSuccess(true);
    } catch (err) {
      const message = extractErrorMessage(err, "Failed to reassign step.");
      setReassignError(message);
      throw err;
    }
  };

  const handleCancelConfirm = async () => {
    setCancelGeneralError(null);
    try {
      await cancelInvoice({ id: detail.id, reason: cancelReason });
      setCancelSuccess(true);
      setCancelModalOpen(false);
    } catch (err) {
      const message = extractErrorMessage(err, "Failed to cancel invoice.");
      setCancelGeneralError(message);
      showErrorToast(message, "Invoice action failed");
    }
  };

  return (
    <div className="space-y-6 border-y border-border/50 bg-secondary/30 px-8 py-5">
      {/* Action bar */}
      {(userCanEdit || userCanEditAsReviewer || userCanCancel || userCanReturn || userCanForward || userCanAttachWorkflow) && (
        <div className="flex flex-wrap items-center gap-3">
          {userCanAttachWorkflow && (
            <button
              onClick={() => setAttachWorkflowOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
            >
              <Link className="h-4 w-4" />
              Attach Workflow
            </button>
          )}
          {(userCanEdit || userCanEditAsReviewer) && (
            <button
              onClick={onEditOpen}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Edit2 className="h-4 w-4" />
              Edit Invoice
            </button>
          )}
          {userCanForward && (
            <button
              onClick={handleForwardToHO}
              disabled={isApproving || forwardSuccess}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Forwarding…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Forward to HO
                </>
              )}
            </button>
          )}
          {userCanReturn && (
            <button
              onClick={() => { setReturnReason(""); setReturnGeneralError(null); setReturnModalOpen(true); }}
              disabled={isRejecting || returnSuccess}
              className="flex items-center gap-2 rounded-xl border border-orange-400/50 bg-orange-50 dark:bg-orange-950/20 px-4 py-2 text-sm font-medium text-orange-700 dark:text-orange-400 transition-colors hover:bg-orange-100 dark:hover:bg-orange-950/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRejecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Returning…
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  Return to Vendor
                </>
              )}
            </button>
          )}
          {userCanRejectToMarketing && (
            <button
              onClick={() => { setRejectReason(""); setRejectGeneralError(null); setRejectModalOpen(true); }}
              className="flex items-center gap-2 rounded-xl border border-orange-400/50 bg-orange-50 dark:bg-orange-950/20 px-4 py-2 text-sm font-medium text-orange-700 dark:text-orange-400 transition-colors hover:bg-orange-100 dark:hover:bg-orange-950/40"
            >
              <XCircle className="h-4 w-4" />
              Reject to Marketing
            </button>
          )}
          {userCanReassign && reviewStep?.assigned_to && (
            <button
              onClick={() => { setReassignError(null); setReassignModalOpen(true); }}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <UserCog className="h-4 w-4" />
              Reassign
            </button>
          )}
          {userCanCancel && (
            <button
              onClick={handleCancelClick}
              disabled={isCancelling || cancelSuccess}
              className="flex items-center gap-2 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cancelling…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Cancel Invoice
                </>
              )}
            </button>
          )}
          {forwardGeneralError && (
            <span className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {forwardGeneralError}
            </span>
          )}
          {(cancelGeneralError || cancelError) && (
            <span className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {cancelGeneralError ??
                (cancelError instanceof ApiError
                  ? cancelError.message
                  : "Cancel failed.")}
            </span>
          )}
          {returnGeneralError && (
            <span className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {returnGeneralError}
            </span>
          )}
          {forwardSuccess && (
            <span className="text-sm text-green-700">
              Invoice forwarded to HO. Refresh to see the updated status.
            </span>
          )}
          {cancelSuccess && (
            <span className="text-sm text-green-700">
              Invoice cancelled successfully. Refresh to see the updated status.
            </span>
          )}
          {returnSuccess && (
            <span className="text-sm text-orange-700">
              Invoice returned to vendor for correction.
            </span>
          )}
          {rejectSuccess && (
            <span className="text-sm text-orange-700">
              Invoice rejected back to marketing for rework.
            </span>
          )}
          {rejectGeneralError && (
            <span className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {rejectGeneralError}
            </span>
          )}
          {reassignSuccess && (
            <span className="text-sm text-green-700">
              Step reassigned successfully. Refresh to see the updated assignee.
            </span>
          )}
          {reassignError && (
            <span className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {reassignError}
            </span>
          )}
        </div>
      )}

      {/* Metadata grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <DetailMetaItem label="Invoice Number" value={detail.invoice_number} />
        <DetailMetaItem label="Vendor Invoice" value={detail.vendor_invoice_number || "—"} />
        <DetailMetaItem
          label="Subtotal"
          value={formatCurrency(detail.subtotal_amount, detail.currency)}
        />
        <DetailMetaItem label="Tax" value={formatCurrency(detail.tax_amount, detail.currency)} />
        <DetailMetaItem
          label="Total"
          value={formatCurrency(detail.total_amount, detail.currency)}
        />
        <DetailMetaItem label="Invoice Date" value={formatDate(detail.invoice_date)} />
        <DetailMetaItem label="Received Date" value={formatDate(detail.received_date)} />
        <DetailMetaItem label="Due Date" value={formatDate(detail.due_date)} />
        <DetailMetaItem label="Organization" value={detail.organization.name} />
        <DetailMetaItem label="Legal Entity" value={detail.legal_entity.name} />
        <DetailMetaItem label="Campaign" value={detail.primary_campaign?.name ?? "—"} />
        <DetailMetaItem label="Submitted By" value={detail.submitted_by?.full_name || "—"} />
      </div>

      {/* Return reason banner — shown when invoice was returned to vendor */}
      {detail.status === "returned_to_vendor" && detail.returned_reason && (
        <div className="flex gap-3 rounded-xl border border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 p-4">
          <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-1">Returned to Vendor</p>
            <p className="text-sm text-orange-700 dark:text-orange-400">{detail.returned_reason}</p>
          </div>
        </div>
      )}

      {detail.description && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Description
          </h4>
          <p className="text-sm text-foreground">{detail.description}</p>
        </div>
      )}

      {/* Allocations — editable when user has manage capability and invoice is draft */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Allocations / Split
          {!userCanManage && !userCanEditAsReviewer && (
            <span className="ml-2 font-normal normal-case text-muted-foreground/60">
              (view only)
            </span>
          )}
        </h4>
        <AllocationEditor
          invoice={detail}
          canManage={(userCanManage && isDraft) || userCanEditAsReviewer}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tax Components
          </h4>
          {detail.tax_components.length > 0 ? (
            <div className="space-y-2">
              {detail.tax_components.map((component) => (
                <div
                  key={component.id}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {component.tax_type} {component.tax_code ? `(${component.tax_code})` : ""}
                    </p>
                    <p className="text-caption">{component.rate_percent}% rate</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrency(component.tax_amount, component.currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tax components are available or visible for this invoice.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Validation Issues
          </h4>
          {detail.validation_issues.length > 0 ? (
            <div className="space-y-2">
              {detail.validation_issues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-xl border border-border/50 bg-card p-3"
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{issue.rule_code}</p>
                    <span
                      className={`metric-badge ${
                        issue.severity === "blocking"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {issue.severity_display}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{issue.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No validation issues are available or visible for this invoice.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Comments
          </h4>
          {detail.comments.length > 0 ? (
            <div className="space-y-2">
              {detail.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl border border-border/50 bg-card p-3"
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {comment.author?.full_name || "Unknown user"}
                    </p>
                    <div className="flex items-center gap-2">
                      {comment.is_internal && (
                        <span className="metric-badge bg-primary/8 text-primary">Internal</span>
                      )}
                      <span className="text-caption">{formatDate(comment.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground">{comment.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No comments are available or visible for this invoice.
            </p>
          )}
        </div>

        {/* Status History — redacted to [] for non-staff; handle gracefully */}
        {detail.status_history.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status History
            </h4>
            <div className="space-y-2">
              {detail.status_history.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-border/50 bg-card p-3"
                >
                  <div className="mb-0.5 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {entry.from_status} → {entry.to_status}
                    </p>
                    <span className="text-caption">{formatDate(entry.created_at)}</span>
                  </div>
                  {entry.changed_by && (
                    <p className="text-caption">by {entry.changed_by.full_name}</p>
                  )}
                  {entry.reason && (
                    <p className="mt-1 text-sm text-muted-foreground">{entry.reason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setCancelModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
            >
              <div className="mb-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-destructive" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Cancel Invoice</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Are you sure you want to cancel this invoice? This action is permanent.
                  </p>
                </div>
              </div>

              <div className="mb-4 space-y-2">
                <label htmlFor="cancelReason" className="text-caption font-semibold text-foreground">
                  Reason (optional)
                </label>
                <textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Why are you cancelling this invoice?"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                />
              </div>

              {cancelGeneralError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{cancelGeneralError}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setCancelModalOpen(false)}
                  disabled={isCancelling}
                  className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Keep Invoice
                </button>
                <button
                  onClick={handleCancelConfirm}
                  disabled={isCancelling}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Cancel Invoice
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Return to Vendor Modal */}
      <AnimatePresence>
        {returnModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => !isRejecting && setReturnModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/40">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Return to Vendor</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The vendor will be notified to correct and resubmit this invoice.
                  </p>
                </div>
              </div>

              <div className="mb-4 space-y-2">
                <label htmlFor="returnReason" className="text-caption font-semibold text-foreground">
                  Reason for Return <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="returnReason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Explain what the vendor needs to correct…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                />
              </div>

              {returnGeneralError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{returnGeneralError}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setReturnModalOpen(false)}
                  disabled={isRejecting}
                  className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Keep in Review
                </button>
                <button
                  onClick={async () => {
                    if (!returnReason.trim()) {
                      setReturnGeneralError("A reason is required when returning an invoice to the vendor.");
                      return;
                    }
                    if (!reviewStep?.id) {
                      setReturnGeneralError("No active review step found for this invoice.");
                      return;
                    }
                    setReturnGeneralError(null);
                    try {
                      await rejectStepFn({ stepId: reviewStep.id, comment: returnReason });
                      setReturnSuccess(true);
                      setReturnModalOpen(false);
                    } catch (err) {
                      const message = extractErrorMessage(err, "Failed to return invoice to vendor.");
                      setReturnGeneralError(message);
                      showErrorToast(message, "Invoice action failed");
                    }
                  }}
                  disabled={isRejecting || !returnReason.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRejecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Returning…
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      Return to Vendor
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject to Marketing Modal */}
      <AnimatePresence>
        {rejectModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => !isRejecting && setRejectModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/40">
                  <XCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Reject to Marketing</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The invoice will be returned to marketing for rework before it can be resubmitted.
                  </p>
                </div>
              </div>

              <div className="mb-4 space-y-2">
                <label htmlFor="rejectReason" className="text-caption font-semibold text-foreground">
                  Reason for Rejection <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain what marketing needs to correct before resubmitting…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                />
              </div>

              {rejectGeneralError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{rejectGeneralError}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setRejectModalOpen(false)}
                  disabled={isRejecting}
                  className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Keep in Review
                </button>
                <button
                  onClick={async () => {
                    if (!rejectReason.trim()) {
                      setRejectGeneralError("A reason is required when rejecting an invoice back to marketing.");
                      return;
                    }
                    if (!reviewStep?.id) {
                      setRejectGeneralError("No active approval step found for this invoice.");
                      return;
                    }
                    setRejectGeneralError(null);
                    try {
                      await rejectStepFn({ stepId: reviewStep.id, comment: rejectReason });
                      setRejectSuccess(true);
                      setRejectModalOpen(false);
                    } catch (err) {
                      const message = extractErrorMessage(err, "Failed to reject invoice to marketing.");
                      setRejectGeneralError(message);
                      showErrorToast(message, "Invoice action failed");
                    }
                  }}
                  disabled={isRejecting || !rejectReason.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRejecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Rejecting…
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      Reject to Marketing
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attach Workflow dialog */}
      <AttachWorkflowDialog
        open={attachWorkflowOpen}
        onClose={() => setAttachWorkflowOpen(false)}
        invoice={detail}
      />

      {/* Reassign dialog */}
      <ReassignDialog
        open={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        stepId={reviewStep?.id ?? ""}
        stepName={reviewStep ? `Step ${reviewStep.step_type}` : ""}
        currentAssignee={reviewStep?.assigned_to ?? null}
        onReassign={handleReassign}
        isReassigning={isReassigning}
        error={reassignError}
      />
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: InvoiceListItem }) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { data, isLoading, error } = useInvoice(expanded ? invoice.id : undefined);
  const config = statusConfig[invoice.status];
  const Icon = config.icon;

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="group cursor-pointer transition-colors hover:bg-secondary/50"
        onClick={() => setExpanded((current) => !current)}
      >
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
            <div>
              <span className="text-sm font-medium text-foreground">{invoice.invoice_number}</span>
              {invoice.is_exception && (
                <span className="metric-badge-destructive ml-2">
                  <AlertTriangle className="h-3 w-3" />
                  Exception
                </span>
              )}
              {invoice.vendor_invoice_number && (
                <p className="mt-0.5 text-caption">Vendor ref: {invoice.vendor_invoice_number}</p>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/8">
              <span className="text-[10px] font-semibold text-primary">
                {initials(invoice.vendor.name)}
              </span>
            </div>
            <span className="text-sm text-foreground">{invoice.vendor.name}</span>
          </div>
        </td>
        <td className="px-4 py-3.5 text-sm text-muted-foreground">
          {formatDate(invoice.invoice_date)}
        </td>
        <td className="px-4 py-3.5 text-right">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(invoice.total_amount, invoice.currency)}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <span className={config.className}>
            <Icon className="h-3 w-3" />
            {invoice.status_display || config.label}
          </span>
        </td>
        <td className="px-4 py-3.5">
          {invoice.allocation_line_count > 0 ? (
            <span className="metric-badge bg-primary/8 text-primary">
              <Split className="h-3 w-3" />
              {invoice.allocation_line_count} allocations
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No allocations</span>
          )}
        </td>
      </motion.tr>

      <AnimatePresence>
        {expanded && (
          <motion.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <td colSpan={6} className="p-0">
              {isLoading ? (
                <div className="border-y border-border/50 bg-secondary/30 px-8 py-8">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading invoice detail…
                  </div>
                </div>
              ) : error ? (
                <div className="border-y border-border/50 bg-secondary/30 px-8 py-8">
                  <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    {getErrorMessage(error, "Failed to load invoice detail.")}
                  </div>
                </div>
              ) : data ? (
                <>
                  <InvoiceDetailContent
                    detail={data}
                    onEditOpen={() => setEditOpen(true)}
                  />
                  <AnimatePresence>
                    {editOpen && (
                      <EditInvoiceDialog
                        invoice={data}
                        onClose={() => setEditOpen(false)}
                      />
                    )}
                  </AnimatePresence>
                </>
              ) : null}
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

function BillsTableSkeleton() {
  return (
    <tbody className="divide-y divide-border/50">
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          <td className="px-4 py-4">
            <div className="h-4 w-36 rounded bg-muted" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 w-32 rounded bg-muted" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 w-24 rounded bg-muted" />
          </td>
          <td className="px-4 py-4">
            <div className="ml-auto h-4 w-24 rounded bg-muted" />
          </td>
          <td className="px-4 py-4">
            <div className="h-6 w-28 rounded bg-muted" />
          </td>
          <td className="px-4 py-4">
            <div className="h-6 w-24 rounded bg-muted" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

export default function VendorBillsPage() {
  const { user } = useAuth();
  const { data: currentUserData } = useCurrentUser();
  const { invoices, isLoading, error } = useInvoices();
  const { createInvoice, isCreating } = useCreateInvoice();
  const { vendors, isLoading: vendorsLoading } = useVendors(
    user?.organization_id ? { organization: user.organization_id } : undefined,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<BillsFilter>("All");
  const [exportOpen, setExportOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const legalEntityId = currentUserData?.primary_org_assignment?.org_unit?.legal_entity_id ?? null;

  const filteredInvoices = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesSearch =
        needle.length === 0 ||
        invoice.invoice_number.toLowerCase().includes(needle) ||
        invoice.vendor_invoice_number.toLowerCase().includes(needle) ||
        invoice.vendor.name.toLowerCase().includes(needle) ||
        invoice.vendor.legal_name.toLowerCase().includes(needle);

      return matchesSearch && matchesInvoiceFilter(invoice.status, activeFilter);
    });
  }, [activeFilter, invoices, searchQuery]);

  const counts = useMemo(() => {
    return BILL_FILTERS.reduce<Record<BillsFilter, number>>((accumulator, filter) => {
      accumulator[filter] = invoices.filter((invoice) => matchesInvoiceFilter(invoice.status, filter)).length;
      return accumulator;
    }, {} as Record<BillsFilter, number>);
  }, [invoices]);

  const errorMessage = error ? getErrorMessage(error, "Failed to load invoices.") : null;

  return (
    <AppLayout title="Vendor Bills" subtitle="Invoice management & tracking">
      <AnimatePresence>
        {uploadOpen && canCreateInvoice(user) && (
          <UploadInvoiceDialog
            open={uploadOpen}
            onClose={() => setUploadOpen(false)}
            onCreate={createInvoice}
            isCreating={isCreating}
            vendors={vendors}
            vendorsLoading={vendorsLoading}
            defaultOrganizationId={user.organization_id}
            defaultLegalEntityId={legalEntityId}
          />
        )}
      </AnimatePresence>

      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search invoice number or vendor..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2">
          {canCreateInvoice(user) && (
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-soft hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Upload Invoice
            </button>
          )}
          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {BILL_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`rounded-xl px-4 py-2 text-xs font-medium transition-all ${
              activeFilter === filter
                ? "bg-primary text-primary-foreground shadow-soft"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {filter}
            <span className="ml-1 opacity-70">{counts[filter] ?? 0}</span>
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="widget-card overflow-hidden p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Invoice
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Vendor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Allocations
                </th>
              </tr>
            </thead>

            {isLoading ? (
              <BillsTableSkeleton />
            ) : filteredInvoices.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-muted-foreground">
                    {searchQuery.trim() || activeFilter !== "All"
                      ? "No invoices match the current search or filter."
                      : "No invoices found for your current organization scope."}
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-border/50">
                {filteredInvoices.map((invoice) => (
                  <InvoiceRow key={invoice.id} invoice={invoice} />
                ))}
              </tbody>
            )}
          </table>
        </div>
      </motion.div>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Invoice Summary"
        type="invoices"
      />
    </AppLayout>
  );
}
