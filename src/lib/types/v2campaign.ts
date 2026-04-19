// ── V2 Campaign Types ───────────────────────────────────────────────────────────
// Reflects NewBackend/apps/campaigns/models.py and api/serializers

import type { PaginatedResponse } from "./core";

// ── Status ────────────────────────────────────────────────────────────────────

export type CampaignStatus =
  | "draft"
  | "pending_budget"
  | "budget_variance_pending"
  | "pending_workflow"
  | "in_review"
  | "internally_approved"
  | "finance_pending"
  | "finance_approved"
  | "finance_rejected"
  | "rejected"
  | "cancelled";

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  pending_budget: "Pending Budget",
  budget_variance_pending: "Variance Pending",
  pending_workflow: "Pending Workflow",
  in_review: "In Review",
  internally_approved: "Internally Approved",
  finance_pending: "Finance Pending",
  finance_approved: "Finance Approved",
  finance_rejected: "Finance Rejected",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

// ── Campaign ──────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  org: string | null;
  scope_node: string;
  scope_node_name: string;
  name: string;
  code: string;
  description: string;
  campaign_type: string;
  start_date: string | null;
  end_date: string | null;
  requested_amount: string; // DecimalField → string
  approved_amount: string;
  currency: string;
  category: string | null;
  category_name: string | null;
  subcategory: string | null;
  subcategory_name: string | null;
  budget: string | null;
  budget_variance_request_id: string | null;
  status: CampaignStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── CampaignDocument ──────────────────────────────────────────────────────────

export interface CampaignDocument {
  id: string;
  campaign: string;
  title: string;
  file_url: string;
  document_type: string;
  uploaded_by: string | null;
  created_at: string;
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface CreateCampaignRequest {
  org?: string;
  scope_node: string;
  name: string;
  code: string;
  description?: string;
  campaign_type?: string;
  start_date?: string;
  end_date?: string;
  requested_amount: string;
  currency?: string;
  category?: string;
  subcategory?: string;
  budget?: string;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  campaign_type?: string;
  start_date?: string;
  end_date?: string;
  requested_amount?: string;
  currency?: string;
  category?: string;
  subcategory?: string;
  budget?: string;
}

export interface CreateCampaignDocumentRequest {
  campaign: string;
  title: string;
  file_url: string;
  document_type?: string;
}

export interface SubmitBudgetResponse {
  status: CampaignStatus;
  campaign: Campaign;
}

export interface ReviewBudgetVarianceRequest {
  decision: "approved" | "rejected";
  review_note?: string;
}

export interface CancelCampaignRequest {
  note?: string;
}

export interface CreateWorkflowFromCampaignRequest {
  campaign_id: string;
  assignments?: Record<string, string>;
  activate?: boolean;
}

// ── Paginated responses ──────────────────────────────────────────────────────

export type CampaignListResponse = PaginatedResponse<Campaign>;
export type CampaignDocumentListResponse = PaginatedResponse<CampaignDocument>;