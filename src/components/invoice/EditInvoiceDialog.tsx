/**
 * EditInvoiceDialog — PATCH /api/v1/invoices/<id>/
 *
 * Only shown when invoice is in a mutable state (draft) and user has
 * invoice.edit_draft capability.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useUpdateInvoice } from "@/lib/hooks/useInvoices";
import { useLegalEntities } from "@/lib/hooks/useOrganizations";
import { useVendors } from "@/lib/hooks/useVendors";
import type { InvoiceDetail } from "@/lib/types/invoices";

interface Props {
  invoice: InvoiceDetail;
  onClose: () => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function EditInvoiceDialog({ invoice, onClose }: Props) {
  const { updateInvoice, isUpdating } = useUpdateInvoice();

  const { data: legalEntities = [], isLoading: legalEntitiesLoading } = useLegalEntities(
    invoice.organization.id,
  );
  const { vendors, isLoading: vendorsLoading } = useVendors({
    organization: invoice.organization.id,
  });

  const [form, setForm] = useState({
    legal_entity: invoice.legal_entity.id,
    vendor: invoice.vendor.id,
    vendor_invoice_number: invoice.vendor_invoice_number,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date ?? "",
    received_date: invoice.received_date ?? "",
    subtotal_amount: invoice.subtotal_amount,
    tax_amount: invoice.tax_amount,
    total_amount: invoice.total_amount,
    description: invoice.description ?? "",
    internal_notes: invoice.internal_notes ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset form if the invoice prop changes (e.g. after a save)
  useEffect(() => {
    setForm({
      legal_entity: invoice.legal_entity.id,
      vendor: invoice.vendor.id,
      vendor_invoice_number: invoice.vendor_invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date ?? "",
      received_date: invoice.received_date ?? "",
      subtotal_amount: invoice.subtotal_amount,
      tax_amount: invoice.tax_amount,
      total_amount: invoice.total_amount,
      description: invoice.description ?? "",
      internal_notes: invoice.internal_notes ?? "",
    });
    setErrors({});
    setGeneralError(null);
    setSuccess(false);
  }, [invoice]);

  const setField = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
    setGeneralError(null);
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.vendor_invoice_number.trim()) e.vendor_invoice_number = "Vendor invoice number is required.";
    if (!form.invoice_date) e.invoice_date = "Invoice date is required.";
    const sub = Number(form.subtotal_amount);
    const tax = Number(form.tax_amount);
    const total = Number(form.total_amount);
    if (!Number.isFinite(sub) || sub < 0) e.subtotal_amount = "Enter a valid subtotal.";
    if (!Number.isFinite(tax) || tax < 0) e.tax_amount = "Enter a valid tax amount.";
    if (!Number.isFinite(total) || total <= 0) e.total_amount = "Enter a valid total.";
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    try {
      await updateInvoice({
        id: invoice.id,
        data: {
          legal_entity: form.legal_entity,
          vendor: form.vendor,
          vendor_invoice_number: form.vendor_invoice_number.trim(),
          invoice_date: form.invoice_date,
          due_date: form.due_date || undefined,
          received_date: form.received_date || undefined,
          subtotal_amount: form.subtotal_amount,
          tax_amount: form.tax_amount,
          total_amount: form.total_amount,
          description: form.description,
          internal_notes: form.internal_notes || undefined,
        },
      });
      setSuccess(true);
      setTimeout(onClose, 800);
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrs: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.errors)) {
          const first = messages[0];
          if (first) fieldErrs[field] = first;
        }
        if (Object.keys(fieldErrs).length > 0) {
          setErrors((prev) => ({ ...prev, ...fieldErrs }));
        }
        setGeneralError(
          err.errors.detail?.[0] ?? err.errors.non_field_errors?.[0] ?? null,
        );
        return;
      }
      setGeneralError(getErrorMessage(err, "Failed to update invoice."));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Edit Invoice</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{invoice.invoice_number}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Legal Entity */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Legal Entity</label>
            <select
              value={form.legal_entity}
              disabled={legalEntitiesLoading}
              onChange={(e) => setField("legal_entity", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            >
              {legalEntities.map((le) => (
                <option key={le.id} value={le.id}>{le.name}</option>
              ))}
            </select>
            {errors.legal_entity && <p className="mt-1 text-[11px] text-destructive">{errors.legal_entity}</p>}
          </div>

          {/* Vendor */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Vendor</label>
            <select
              value={form.vendor}
              disabled={vendorsLoading}
              onChange={(e) => setField("vendor", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
              ))}
            </select>
            {errors.vendor && <p className="mt-1 text-[11px] text-destructive">{errors.vendor}</p>}
          </div>

          {/* Vendor Invoice Number */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Vendor Invoice Number *</label>
            <input
              value={form.vendor_invoice_number}
              onChange={(e) => setField("vendor_invoice_number", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {errors.vendor_invoice_number && <p className="mt-1 text-[11px] text-destructive">{errors.vendor_invoice_number}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Invoice Date *</label>
              <input
                type="date"
                value={form.invoice_date}
                onChange={(e) => setField("invoice_date", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.invoice_date && <p className="mt-1 text-[11px] text-destructive">{errors.invoice_date}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setField("due_date", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Received Date</label>
              <input
                type="date"
                value={form.received_date}
                onChange={(e) => setField("received_date", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Subtotal *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.subtotal_amount}
                onChange={(e) => setField("subtotal_amount", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.subtotal_amount && <p className="mt-1 text-[11px] text-destructive">{errors.subtotal_amount}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tax *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.tax_amount}
                onChange={(e) => setField("tax_amount", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.tax_amount && <p className="mt-1 text-[11px] text-destructive">{errors.tax_amount}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Total *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.total_amount}
                onChange={(e) => setField("total_amount", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.total_amount && <p className="mt-1 text-[11px] text-destructive">{errors.total_amount}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {/* Internal Notes (only shown if the field is visible / non-empty or user is staff) */}
          {(invoice.internal_notes !== undefined) && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Internal Notes <span className="opacity-60">(staff only)</span>
              </label>
              <textarea
                rows={2}
                value={form.internal_notes}
                onChange={(e) => setField("internal_notes", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          )}

          {generalError && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {generalError}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
              Invoice updated successfully.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating || success}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

