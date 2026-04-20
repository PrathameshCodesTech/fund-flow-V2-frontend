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
}

export interface InvoiceFinanceDocument {
  id: number;
  file_name: string;
  document_type: string;
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
