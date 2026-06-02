// ── V2 Finance Handoff Types ──────────────────────────────────────────────────
// Reflects NewBackend/apps/finance/api/serializers/__init__.py (FinanceHandoffSerializer)

import type { PaginatedResponse } from "./core";

// ── Status ────────────────────────────────────────────────────────────────────

export type FinanceHandoffStatus =
  | "pending"
  | "sent"
  | "finance_approved"
  | "finance_rejected"
  | "cancelled";

export const FINANCE_HANDOFF_STATUS_LABELS: Record<FinanceHandoffStatus, string> = {
  pending: "Pending",
  sent: "Sent",
  finance_approved: "Finance Approved",
  finance_rejected: "Finance Rejected",
  cancelled: "Cancelled",
};

// ── FinanceHandoff ────────────────────────────────────────────────────────────

export interface FinanceHandoff {
  id: string;
  org: string | null;
  scope_node: string | null;
  module: string;
  subject_type: string;
  subject_id: string;
  subject_name: string;
  vendor_name: string | null;
  status: FinanceHandoffStatus;
  export_file: string | null;
  submitted_by: string | null;
  finance_reference_id: string | null;
  sent_at: string | null;
  recipient_emails: string[];
  recipient_count: number;
  created_at: string;
  updated_at: string;
}

// ── Paginated response ────────────────────────────────────────────────────────

export type FinanceHandoffListResponse = PaginatedResponse<FinanceHandoff>;

// ── Filter params ─────────────────────────────────────────────────────────────

export interface FinanceHandoffFilters {
  module?: string;
  subject_type?: string;
  subject_id?: string;
  status?: string;
  org?: string;
  scope_node?: string;
}

export interface PublicFinanceToken {
  action_type: "approve" | "reject";
  is_expired: boolean;
  is_used: boolean;
  module: string;
  subject_type: string;
  subject_name: string;
  handoff_status: string;
  reject_token?: string | null;
  // Rich invoice fields (present when module === "invoice")
  handoff?: InvoiceFinanceHandoff;
  invoice?: InvoiceFinanceData;
  vendor?: InvoiceFinanceVendor;
  documents?: InvoiceFinanceDocument[];
  allocations?: InvoiceFinanceAllocation[];
  workflow?: InvoiceFinanceWorkflow;
  timeline?: InvoiceFinanceTimelineEvent[];
}

export interface InvoiceFinanceHandoff {
  id: number;
  status: string;
  sent_at: string | null;
  created_at: string;
  finance_reference_id: string | null;
  recipient_count: number;
  recipient_emails: string[];
}

export interface InvoiceFinanceData {
  id: number;
  title: string;
  amount: string;
  currency: string;
  status: string;
  po_number: string | null;
  vendor_invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  description: string | null;
  scope_node_id: number;
  scope_node_name: string;
  can_record_payment?: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceFinanceVendor {
  id: number;
  vendor_name: string;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  pan: string | null;
  sap_vendor_id: string | null;
  preferred_payment_mode?: string | null;
  beneficiary_name?: string | null;
  beneficiary_account_number?: string | null;
  bank_name?: string | null;
  bank_address?: string | null;
  bank_email?: string | null;
  account_number?: string | null;
  bank_account_number?: string | null;
  bank_account_type?: string | null;
  ifsc?: string | null;
  micr_code?: string | null;
  neft_code?: string | null;
  bank_branch_address_line1?: string | null;
  bank_branch_address_line2?: string | null;
  bank_branch_city?: string | null;
  bank_branch_state?: string | null;
  bank_branch_country?: string | null;
  bank_branch_pincode?: string | null;
  bank_phone?: string | null;
  bank_fax?: string | null;
}

export interface InvoiceFinanceDocument {
  id: number;
  file_name: string;
  document_type: string;
  document_group: "invoice" | "vendor";
  uploaded_at: string | null;
  url: string | null;
}

export interface InvoiceFinanceAllocation {
  id: number;
  entity_name: string | null;
  amount: string;
  category_name: string | null;
  subcategory_name: string | null;
  campaign_name: string | null;
  budget_name: string | null;
  selected_approver_email: string | null;
  status: string;
  note: string | null;
}

export interface InvoiceFinanceWorkflowStep {
  name: string;
  status: string;
  assigned_user_email: string | null;
  acted_at: string | null;
  note: string | null;
}

export interface InvoiceFinanceWorkflowBranch {
  entity_name: string | null;
  status: string;
  assigned_user_email: string | null;
  acted_at: string | null;
  note: string | null;
}

export interface InvoiceFinanceWorkflowGroup {
  name: string;
  status: string;
  display_order: number;
  steps: InvoiceFinanceWorkflowStep[];
  branches: InvoiceFinanceWorkflowBranch[];
}

export interface InvoiceFinanceWorkflow {
  instance_id: number | null;
  status: string | null;
  template_name: string | null;
  version_number: number | null;
  groups: InvoiceFinanceWorkflowGroup[];
}

export interface InvoiceFinanceTimelineEvent {
  event_type: string;
  actor_email: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface FinanceApproveRequest {
  reference_id: string;
  note?: string;
}

export interface FinanceRejectRequest {
  note?: string;
}

// ── Finance Decision ───────────────────────────────────────────────────────────

export type FinanceDecisionType = "approved" | "rejected";

export interface FinanceDecision {
  id: number;
  handoff_id: number;
  decision: FinanceDecisionType;
  reference_id: string | null;
  note: string | null;
  decided_by_email: string | null;
  decided_at: string;
  created_at: string;
}

// ── Finance Handoff Response (for approve/reject) ─────────────────────────────

export interface FinanceHandoffResponse {
  handoff: FinanceHandoff;
  decision: FinanceDecision;
}
