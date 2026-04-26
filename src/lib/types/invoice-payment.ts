// ── Invoice Payment Types ───────────────────────────────────────────────────

import type { PaginatedResponse } from "./core";

// ── Enums ───────────────────────────────────────────────────────────────────

export type InvoicePaymentStatus = "pending" | "paid" | "failed" | "reversed";

export const PAYMENT_STATUS_LABELS: Record<InvoicePaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  reversed: "Reversed",
};

export const PAYMENT_STATUS_COLORS: Record<InvoicePaymentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  reversed: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export type PaymentMethod = "bank_transfer" | "rtgs" | "neft" | "imps" | "upi" | "cheque" | "other";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Bank Transfer",
  rtgs: "RTGS",
  neft: "NEFT",
  imps: "IMPS",
  upi: "UPI",
  cheque: "Cheque",
  other: "Other",
};

// ── Model ────────────────────────────────────────────────────────────────────

export interface InvoicePayment {
  id: string;
  invoice: string;
  payment_status: InvoicePaymentStatus;
  payment_method: string;
  payment_reference_number: string;
  utr_number: string;
  transaction_id: string;
  bank_reference_number: string;
  payer_bank_name: string;
  beneficiary_name: string;
  beneficiary_bank_name: string;
  paid_amount: string;
  currency: string;
  payment_date: string | null;
  remarks: string;
  recorded_by: string | null;
  recorded_by_name: string;
  recorded_at: string | null;
  updated_by: string | null;
  updated_by_name: string;
  updated_at: string;
  can_record_payment: boolean;
}

// ── Vendor-safe subset (excludes internal bank fields) ───────────────────────

export interface VendorInvoicePayment {
  payment_status: InvoicePaymentStatus;
  payment_method: string;
  payment_reference_number: string;
  utr_number: string;
  paid_amount: string;
  currency: string;
  payment_date: string | null;
  remarks: string;
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface RecordPaymentRequest {
  payment_status?: InvoicePaymentStatus;
  payment_method?: PaymentMethod;
  payment_reference_number?: string;
  utr_number?: string;
  transaction_id?: string;
  bank_reference_number?: string;
  payer_bank_name?: string;
  beneficiary_name?: string;
  beneficiary_bank_name?: string;
  paid_amount?: string;
  currency?: string;
  payment_date?: string;
  remarks?: string;
}

export interface UpdatePaymentRequest extends RecordPaymentRequest {}