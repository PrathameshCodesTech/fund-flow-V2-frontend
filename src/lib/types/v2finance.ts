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
}

export interface FinanceApproveRequest {
  reference_id: string;
  note?: string;
}

export interface FinanceRejectRequest {
  note?: string;
}
