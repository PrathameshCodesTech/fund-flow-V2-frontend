/**
 * RecordPaymentDialog — Reusable payment recording dialog for invoices.
 *
 * Used in:
 * - InvoicesPage.tsx (normal invoice page)
 * - FinanceInvoiceReviewPage.tsx (finance portal)
 */

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useInvoicePayment, useRecordInvoicePayment } from "@/lib/hooks/useV2Invoice";
import { ApiError } from "@/lib/api/client";
import type {
  InvoicePayment,
  InvoicePaymentStatus,
  PaymentMethod,
  RecordPaymentRequest,
} from "@/lib/types/invoice-payment";
import { PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/types/invoice-payment";
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
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, FileText } from "lucide-react";

interface RecordPaymentDialogProps {
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional callback after successful payment record */
  onSuccess?: () => void;
  /** Additional query keys to invalidate after success */
  additionalInvalidateKeys?: unknown[][];
}

export function RecordPaymentDialog({
  invoiceId,
  open,
  onOpenChange,
  onSuccess,
  additionalInvalidateKeys = [],
}: RecordPaymentDialogProps) {
  const queryClient = useQueryClient();
  const { data: payment, isLoading } = useInvoicePayment(open ? invoiceId : null);
  const recordMutation = useRecordInvoicePayment();

  const [form, setForm] = useState<RecordPaymentRequest>({
    payment_status: "pending",
    payment_method: undefined,
    payment_reference_number: "",
    utr_number: "",
    transaction_id: "",
    bank_reference_number: "",
    paid_amount: "",
    currency: "INR",
    payment_date: "",
    remarks: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setForm({
        payment_status: "pending",
        payment_method: undefined,
        payment_reference_number: "",
        utr_number: "",
        transaction_id: "",
        bank_reference_number: "",
        paid_amount: "",
        currency: "INR",
        payment_date: "",
        remarks: "",
      });
      setFieldErrors({});
    }
  }, [open]);

  const handleStatusChange = (status: InvoicePaymentStatus) => {
    setForm((f) => ({ ...f, payment_status: status }));
  };

  const handleMethodChange = (method: PaymentMethod) => {
    setForm((f) => ({ ...f, payment_method: method }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (form.payment_status === "paid") {
      if (!form.payment_date) errors.payment_date = "Required";
      const amount = parseFloat(form.paid_amount || "0");
      if (!form.paid_amount || amount <= 0) errors.paid_amount = "Must be > 0";
      if (!form.utr_number?.trim()) {
        errors.utr_number = "Required";
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await recordMutation.mutateAsync({ invoiceId, data: form });
      toast.success("Payment recorded successfully");
      // Invalidate additional queries if provided
      for (const keys of additionalInvalidateKeys) {
        queryClient.invalidateQueries({ queryKey: keys });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to record payment";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Create or update the payment record for this finance-approved invoice.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : payment ? (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{PAYMENT_STATUS_LABELS[payment.payment_status]}</span>
              </div>
              {payment.payment_method && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium">{PAYMENT_METHOD_LABELS[payment.payment_method as PaymentMethod] ?? payment.payment_method}</span>
                </div>
              )}
              {payment.paid_amount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{payment.currency} {parseFloat(payment.paid_amount).toLocaleString()}</span>
                </div>
              )}
              {payment.payment_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{new Date(payment.payment_date).toLocaleDateString("en-IN")}</span>
                </div>
              )}
              {(payment.payment_reference_number || payment.utr_number) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ref / UTR</span>
                  <span className="font-medium font-mono text-xs">{payment.payment_reference_number || payment.utr_number}</span>
                </div>
              )}
              {payment.remarks && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remarks</span>
                  <span className="font-medium">{payment.remarks}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-border">
                <span className="text-muted-foreground">Recorded by</span>
                <span className="font-medium">{payment.recorded_by_name}</span>
              </div>
            </div>

            {payment.payment_status !== "paid" && (
              <PaymentForm
                form={form}
                setForm={setForm}
                fieldErrors={fieldErrors}
                handleStatusChange={handleStatusChange}
                handleMethodChange={handleMethodChange}
                isUpdate
              />
            )}
          </div>
        ) : (
          <PaymentForm
            form={form}
            setForm={setForm}
            fieldErrors={fieldErrors}
            handleStatusChange={handleStatusChange}
            handleMethodChange={handleMethodChange}
            isUpdate={false}
          />
        )}

        <DialogFooter className="pt-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={recordMutation.isPending || (payment?.payment_status === "paid")}
          >
            {recordMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {payment ? "Update Payment" : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Payment Form Fields ─────────────────────────────────────────────────────

interface PaymentFormProps {
  form: RecordPaymentRequest;
  setForm: React.Dispatch<React.SetStateAction<RecordPaymentRequest>>;
  fieldErrors: Record<string, string>;
  handleStatusChange: (status: InvoicePaymentStatus) => void;
  handleMethodChange: (method: PaymentMethod) => void;
  isUpdate: boolean;
}

function PaymentForm({
  form,
  setForm,
  fieldErrors,
  handleStatusChange,
  handleMethodChange,
  isUpdate,
}: PaymentFormProps) {
  return (
    <div className="space-y-3">
      {isUpdate && (
        <>
          <Separator />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Update Payment</p>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={form.payment_status} onValueChange={(v) => handleStatusChange(v as InvoicePaymentStatus)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="reversed">Reversed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Method</Label>
          <Select value={form.payment_method ?? ""} onValueChange={(v) => handleMethodChange(v as PaymentMethod)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="rtgs">RTGS</SelectItem>
              <SelectItem value="neft">NEFT</SelectItem>
              <SelectItem value="imps">IMPS</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {fieldErrors.payment_method && <p className="text-xs text-destructive mt-0.5">{fieldErrors.payment_method}</p>}
        </div>
      </div>

      {form.payment_status === "paid" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Paid Amount *</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.paid_amount}
                onChange={(e) => setForm((f) => ({ ...f, paid_amount: e.target.value }))}
              />
              {fieldErrors.paid_amount && <p className="text-xs text-destructive mt-0.5">{fieldErrors.paid_amount}</p>}
            </div>
            <div>
              <Label className="text-xs">Payment Date *</Label>
              <Input
                className="h-8 text-xs"
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
              />
              {fieldErrors.payment_date && <p className="text-xs text-destructive mt-0.5">{fieldErrors.payment_date}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Ref Number</Label>
              <Input
                className="h-8 text-xs"
                placeholder="REF-001"
                value={form.payment_reference_number}
                onChange={(e) => setForm((f) => ({ ...f, payment_reference_number: e.target.value }))}
              />
              {fieldErrors.payment_reference_number && <p className="text-xs text-destructive mt-0.5">{fieldErrors.payment_reference_number}</p>}
            </div>
            <div>
              <Label className="text-xs">UTR Number *</Label>
              <Input
                className="h-8 text-xs"
                placeholder="UTR-001"
                value={form.utr_number}
                onChange={(e) => setForm((f) => ({ ...f, utr_number: e.target.value }))}
              />
              {fieldErrors.utr_number && <p className="text-xs text-destructive mt-0.5">{fieldErrors.utr_number}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Transaction ID</Label>
              <Input
                className="h-8 text-xs"
                placeholder="TXN-001"
                value={form.transaction_id}
                onChange={(e) => setForm((f) => ({ ...f, transaction_id: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Bank Ref</Label>
              <Input
                className="h-8 text-xs"
                placeholder="BNK-REF"
                value={form.bank_reference_number}
                onChange={(e) => setForm((f) => ({ ...f, bank_reference_number: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Payer Bank</Label>
              <Input
                className="h-8 text-xs"
                placeholder="HDFC Bank"
                value={form.payer_bank_name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, payer_bank_name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Beneficiary Bank</Label>
              <Input
                className="h-8 text-xs"
                placeholder="ICICI Bank"
                value={form.beneficiary_bank_name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, beneficiary_bank_name: e.target.value }))}
              />
            </div>
          </div>
        </>
      )}

      <div>
        <Label className="text-xs">Remarks</Label>
        <Input
          className="h-8 text-xs"
          placeholder="Optional notes"
          value={form.remarks}
          onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
        />
      </div>
    </div>
  );
}

// ── Record Payment Button ───────────────────────────────────────────────────

interface RecordPaymentButtonProps {
  invoiceId: string;
  className?: string;
  fullWidth?: boolean;
  /** Optional callback after successful payment record */
  onSuccess?: () => void;
  /** Additional query keys to invalidate after success */
  additionalInvalidateKeys?: unknown[][];
}

export function RecordPaymentButton({
  invoiceId,
  className,
  fullWidth = true,
  onSuccess,
  additionalInvalidateKeys = [],
}: RecordPaymentButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        className={cn(fullWidth ? "w-full gap-1.5" : "gap-1.5", className)}
        onClick={() => setOpen(true)}
      >
        <FileText className="h-3.5 w-3.5" />
        Record Payment
      </Button>

      <RecordPaymentDialog
        invoiceId={invoiceId}
        open={open}
        onOpenChange={setOpen}
        onSuccess={onSuccess}
        additionalInvalidateKeys={additionalInvalidateKeys}
      />
    </>
  );
}
