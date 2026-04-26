// ── Manual Expense Types ─────────────────────────────────────────────────────

import type { PaginatedResponse } from "./core";

// ── Enums ───────────────────────────────────────────────────────────────────

export type ExpenseStatus = "draft" | "submitted" | "settled" | "cancelled";

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  settled: "Settled",
  cancelled: "Cancelled",
};

export const EXPENSE_STATUS_COLORS: Record<ExpenseStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  settled: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export type PaymentMethod = "petty_cash" | "reimbursement";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  petty_cash: "Petty Cash",
  reimbursement: "Reimbursement",
};

// ── Models ──────────────────────────────────────────────────────────────────

export interface ManualExpenseAttachment {
  id: string;
  expense_entry: string;
  title: string;
  document_type: string;
  file_name: string;
  download_url: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ManualExpenseEntry {
  id: string;
  org: string | null;
  scope_node: string;
  created_by: string;
  created_by_name: string;
  status: ExpenseStatus;
  payment_method: PaymentMethod;
  vendor_name: string;
  vendor: string | null;
  reference_number: string;
  expense_date: string;
  amount: string;
  currency: string;
  budget: string;
  budget_name: string;
  budget_line: string | null;
  category: string;
  category_name: string;
  subcategory: string;
  subcategory_name: string;
  description: string;
  source_note: string;
  attachment_count: number;
  attachments: ManualExpenseAttachment[];
  submitted_at: string | null;
  settled_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManualExpenseListItem {
  id: string;
  org: string | null;
  scope_node: string;
  status: ExpenseStatus;
  payment_method: PaymentMethod;
  vendor_name: string;
  reference_number: string;
  expense_date: string;
  amount: string;
  currency: string;
  budget_name: string;
  category_name: string;
  subcategory_name: string;
  description: string;
  attachment_count: number;
  submitted_at: string | null;
  settled_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Request shapes ───────────────────────────────────────────────────────────

export interface CreateExpenseRequest {
  scope_node?: string;
  payment_method: PaymentMethod;
  vendor_name?: string;
  vendor?: string;
  reference_number?: string;
  expense_date: string;
  amount: string;
  currency?: string;
  budget: string;
  budget_line?: string;
  category: string;
  subcategory: string;
  description?: string;
  source_note?: string;
}

export interface UpdateExpenseRequest extends Partial<CreateExpenseRequest> {}

// ── Paginated response ────────────────────────────────────────────────────────

export type ExpenseListResponse = PaginatedResponse<ManualExpenseListItem>;
export type ExpenseDetailResponse = PaginatedResponse<ManualExpenseEntry>;