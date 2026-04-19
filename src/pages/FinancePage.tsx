import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { canManageInvoice, canViewFinanceReporting } from "@/lib/capabilities";
import { usePayableInvoices, usePayments, usePayment, useCreatePayment, useUpdatePayment } from "@/lib/hooks/useFinance";
import { ApiError } from "@/lib/api/client";
import type { InvoiceListItem } from "@/lib/types/invoices";
import type { PaymentRecord, PaymentCreatePayload } from "@/lib/types/finance";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: string | number, currency: string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(n)) return "—";
  if (currency === "INR") {
    if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
    if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
    return `₹${n.toLocaleString("en-IN")}`;
  }
  return `${currency} ${n.toLocaleString()}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ── Status badges ─────────────────────────────────────────────────────────────

type InvoiceStatusBadgeProps = { status: string };

function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const variants: Record<string, { label: string; className: string }> = {
    approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    pending_payment: { label: "Pending Payment", className: "bg-amber-100 text-amber-800 border-amber-200" },
    paid: { label: "Paid", className: "bg-blue-100 text-blue-800 border-blue-200" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-200" },
    under_review: { label: "Under Review", className: "bg-purple-100 text-purple-800 border-purple-200" },
    draft: { label: "Draft", className: "bg-gray-100 text-gray-700 border-gray-200" },
    cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500 border-gray-200" },
  };

  const v = variants[status] ?? { label: status, className: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${v.className}`}>
      {v.label}
    </span>
  );
}

type PaymentStatusBadgeProps = { status: string };

function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const variants: Record<string, { label: string; className: string; Icon: typeof Clock }> = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200", Icon: Clock },
    initiated: { label: "Initiated", className: "bg-blue-100 text-blue-800 border-blue-200", Icon: RefreshCw },
    processing: { label: "Processing", className: "bg-purple-100 text-purple-800 border-purple-200", Icon: Loader2 },
    completed: { label: "Completed", className: "bg-emerald-100 text-emerald-800 border-emerald-200", Icon: CheckCircle2 },
    failed: { label: "Failed", className: "bg-red-100 text-red-800 border-red-200", Icon: AlertCircle },
    reversed: { label: "Reversed", className: "bg-orange-100 text-orange-800 border-orange-200", Icon: RefreshCw },
    cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500 border-gray-200", Icon: AlertCircle },
  };

  const v = variants[status] ?? { label: status, className: "bg-gray-100 text-gray-600 border-gray-200", Icon: Clock };
  const Icon = v.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${v.className}`}>
      <Icon className="w-3 h-3" />
      {v.label}
    </span>
  );
}

// ── Record Payment Dialog ─────────────────────────────────────────────────────

interface RecordPaymentDialogProps {
  invoice: InvoiceListItem | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function RecordPaymentDialog({ invoice, open, onClose, onSuccess }: RecordPaymentDialogProps) {
  const { createPayment, isCreating } = useCreatePayment();
  const { toast } = useToast();

  const [form, setForm] = useState({
    payment_date: new Date().toISOString().split("T")[0],
    amount: invoice?.total_amount ?? "",
    currency: invoice?.currency ?? "INR",
    payment_method: "bank_transfer",
    payment_reference: "",
    notes: "",
    bank_transaction_id: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !invoice) return;

    setForm({
      payment_date: new Date().toISOString().split("T")[0],
        amount: invoice.total_amount,
        currency: invoice.currency,
      payment_method: "bank_transfer",
      payment_reference: "",
      notes: "",
      bank_transaction_id: "",
    });
    setErrors({});
  }, [invoice, open]);

  const handleSubmit = async () => {
    if (!invoice) return;

    setErrors({});
    const payload: PaymentCreatePayload = {
      invoice: invoice.id,
      payment_date: form.payment_date,
      amount: form.amount,
      currency: form.currency,
      payment_method: form.payment_method || undefined,
      payment_reference: form.payment_reference || undefined,
      notes: form.notes || undefined,
      bank_transaction_id: form.bank_transaction_id || undefined,
    };

    try {
      await createPayment(payload);
      toast({
        title: "Payment recorded",
        description: `Payment of ${formatCurrency(form.amount, form.currency)} recorded. Invoice moved to pending payment.`,
      });
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(
          Object.fromEntries(
            Object.entries(err.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)])
          )
        );
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  };

  if (!invoice) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Record Payment
          </DialogTitle>
        </DialogHeader>

        {/* Invoice reference */}
        <div className="bg-muted/40 rounded-lg p-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice</span>
            <span className="font-medium">{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vendor</span>
            <span className="font-medium">{invoice.vendor.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice Total</span>
            <span className="font-semibold text-primary">
              {formatCurrency(invoice.total_amount, invoice.currency)}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Payment Date */}
          <div className="space-y-1.5">
            <Label htmlFor="payment_date">Payment Date *</Label>
            <Input
              id="payment_date"
              type="date"
              value={form.payment_date}
              onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
            />
            {errors.payment_date && <p className="text-xs text-destructive">{errors.payment_date}</p>}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
            <p className="text-xs text-muted-foreground">
              Max: {formatCurrency(invoice.total_amount, invoice.currency)}
            </p>
          </div>

          {/* Currency */}
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency *</Label>
            <Input
              id="currency"
              value={form.currency}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Must match invoice currency</p>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select
              value={form.payment_method}
              onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v }))}
            >
              <SelectTrigger id="payment_method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="neft">NEFT</SelectItem>
                <SelectItem value="rtgs">RTGS</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Reference */}
          <div className="space-y-1.5">
            <Label htmlFor="payment_reference">Reference Number</Label>
            <Input
              id="payment_reference"
              placeholder="e.g. UTR number, cheque number"
              value={form.payment_reference}
              onChange={(e) => setForm((f) => ({ ...f, payment_reference: e.target.value }))}
            />
          </div>

          {/* Bank Transaction ID */}
          <div className="space-y-1.5">
            <Label htmlFor="bank_transaction_id">Bank Transaction ID</Label>
            <Input
              id="bank_transaction_id"
              placeholder="Optional"
              value={form.bank_transaction_id}
              onChange={(e) => setForm((f) => ({ ...f, bank_transaction_id: e.target.value }))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional payment notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
            />
          </div>

          {errors.non_field_errors && (
            <p className="text-xs text-destructive">{errors.non_field_errors}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              "Record Payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Payment Detail Panel ──────────────────────────────────────────────────────

const TERMINAL_PAYMENT_STATUSES = new Set(["completed", "failed", "reversed", "cancelled"]);

interface PaymentDetailPanelProps {
  paymentId: string | null;
  open: boolean;
  onClose: () => void;
  canComplete: boolean;
}

function PaymentDetailPanel({ paymentId, open, onClose, canComplete }: PaymentDetailPanelProps) {
  const { data: payment, isLoading } = usePayment(paymentId ?? undefined);
  const { updatePayment, isUpdating } = useUpdatePayment();
  const { toast } = useToast();

  const handleMarkCompleted = async () => {
    if (!payment) return;
    try {
      await updatePayment({ id: payment.id, data: { status: "completed" } });
      toast({
        title: "Payment completed",
        description: "Invoice has been marked as paid.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof ApiError ? err.message : "Failed to complete payment.",
        variant: "destructive",
      });
    }
  };

  const showCompleteAction =
    canComplete &&
    payment !== undefined &&
    !TERMINAL_PAYMENT_STATUSES.has(payment.status);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Payment Detail
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !payment ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            Payment not found
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Status row + complete action */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="flex items-center gap-2">
                <PaymentStatusBadge status={payment.status} />
                {showCompleteAction && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={handleMarkCompleted}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    Mark Completed
                  </Button>
                )}
              </div>
            </div>

            {/* Invoice info */}
            {payment.invoice_detail && (
              <div className="bg-muted/40 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium text-foreground mb-2">Invoice</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice #</span>
                  <span className="font-medium">{payment.invoice_detail.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor</span>
                  <span>{payment.invoice_detail.vendor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Legal Entity</span>
                  <span>{payment.invoice_detail.legal_entity_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Total</span>
                  <span className="font-semibold">
                    {formatCurrency(payment.invoice_detail.total_amount, payment.invoice_detail.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Status</span>
                  <InvoiceStatusBadge status={payment.invoice_detail.status} />
                </div>
              </div>
            )}

            {/* Payment details */}
            <div className="space-y-3 text-sm">
              <p className="font-medium text-foreground">Payment Details</p>
              <DetailRow label="Amount" value={formatCurrency(payment.amount, payment.currency)} />
              <DetailRow label="Currency" value={payment.currency} />
              <DetailRow label="Payment Date" value={formatDate(payment.payment_date)} />
              <DetailRow label="Method" value={payment.payment_method || "—"} />
              <DetailRow label="Reference #" value={payment.payment_reference || "—"} />
              <DetailRow label="Bank TXN ID" value={payment.bank_transaction_id || "—"} />
              {payment.completed_at && (
                <DetailRow label="Completed At" value={formatDate(payment.completed_at)} />
              )}
              <DetailRow label="Initiated By" value={payment.initiated_by_name || "—"} />
              <DetailRow label="Recorded On" value={formatDate(payment.created_at)} />
              {payment.notes && (
                <div>
                  <p className="text-muted-foreground mb-1">Notes</p>
                  <p className="text-foreground bg-muted/30 rounded p-2 text-xs">{payment.notes}</p>
                </div>
              )}
              {payment.failure_reason && (
                <div>
                  <p className="text-muted-foreground mb-1">Failure Reason</p>
                  <p className="text-destructive bg-destructive/10 rounded p-2 text-xs">
                    {payment.failure_reason}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
}

// ── Payable Invoices Tab ──────────────────────────────────────────────────────

interface PayableInvoicesTabProps {
  canRecord: boolean;
  onRecord: (invoice: InvoiceListItem) => void;
}

function PayableInvoicesTab({ canRecord, onRecord }: PayableInvoicesTabProps) {
  const { invoices, isLoading, error } = usePayableInvoices();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive p-4">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">Failed to load payable invoices.</span>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
        <CheckCircle2 className="w-10 h-10 opacity-30" />
        <p className="text-sm">No approved invoices awaiting payment.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Invoice #</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Legal Entity</TableHead>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            {canRecord && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id} className="hover:bg-muted/20 transition-colors">
              <TableCell className="font-medium">{inv.invoice_number}</TableCell>
              <TableCell>{inv.vendor.name}</TableCell>
              <TableCell>{inv.legal_entity.name}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(inv.invoice_date)}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(inv.due_date)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(inv.total_amount, inv.currency)}
              </TableCell>
              <TableCell>
                <InvoiceStatusBadge status={inv.status} />
              </TableCell>
              {canRecord && (
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRecord(inv)}
                    className="gap-1"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Record
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Payment Records Tab ───────────────────────────────────────────────────────

interface PaymentRecordsTabProps {
  onSelect: (payment: PaymentRecord) => void;
}

function PaymentRecordsTab({ onSelect }: PaymentRecordsTabProps) {
  const { payments, isLoading, error } = usePayments();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive p-4">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">Failed to load payment records.</span>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
        <CreditCard className="w-10 h-10 opacity-30" />
        <p className="text-sm">No payment records found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Invoice #</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Payment Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((pmt) => (
            <TableRow
              key={pmt.id}
              className="hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => onSelect(pmt)}
            >
              <TableCell className="font-medium">{pmt.invoice_number}</TableCell>
              <TableCell>{pmt.vendor_name}</TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {pmt.payment_reference || "—"}
              </TableCell>
              <TableCell className="capitalize text-muted-foreground">
                {pmt.payment_method?.replace(/_/g, " ") || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(pmt.payment_date)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(pmt.amount, pmt.currency)}
              </TableCell>
              <TableCell>
                <PaymentStatusBadge status={pmt.status} />
              </TableCell>
              <TableCell>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const { user } = useAuth();
  const canRecord = canManageInvoice(user);
  const canViewFinance = canViewFinanceReporting(user);

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("payable");

  if (!canViewFinance) {
    return (
      <AppLayout title="Finance">
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <AlertCircle className="w-10 h-10" />
          <p className="font-medium">Finance access required</p>
          <p className="text-sm">You need the Finance reporting capability to view this page.</p>
        </div>
      </AppLayout>
    );
  }

  const handleRecord = (invoice: InvoiceListItem) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  };

  const handlePaymentSelect = (payment: PaymentRecord) => {
    setSelectedPaymentId(payment.id);
    setDetailOpen(true);
  };

  const handlePaymentSuccess = () => {
    // Switch to payment records tab to show the newly created payment
    setActiveTab("payments");
  };

  return (
    <AppLayout title="Finance" subtitle="Manage payments for approved invoices">
      <div className="space-y-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="payable">
              Payable Invoices
            </TabsTrigger>
            <TabsTrigger value="payments">
              Payment Records
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payable">
            <PayableInvoicesTab canRecord={canRecord} onRecord={handleRecord} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentRecordsTab onSelect={handlePaymentSelect} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        invoice={selectedInvoice}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedInvoice(null);
        }}
        onSuccess={handlePaymentSuccess}
      />

      {/* Payment Detail Panel */}
      <PaymentDetailPanel
        paymentId={selectedPaymentId}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedPaymentId(null);
        }}
        canComplete={canRecord}
      />
    </AppLayout>
  );
}
