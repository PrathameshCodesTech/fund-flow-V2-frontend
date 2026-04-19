// ── V2 Vendor Types ───────────────────────────────────────────────────────────
// Reflects NewBackend/apps/vendors/models.py and api/serializers

import type { PaginatedResponse } from "./core";

// ── Enums / Statuses ─────────────────────────────────────────────────────────

export type InvitationStatus =
  | "pending"
  | "opened"
  | "submitted"
  | "expired"
  | "cancelled";

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: "Pending",
  opened: "Opened",
  submitted: "Submitted",
  expired: "Expired",
  cancelled: "Cancelled",
};

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "sent_to_finance"
  | "finance_approved"
  | "finance_rejected"
  | "reopened"
  | "marketing_pending"
  | "marketing_approved"
  | "activated"
  | "rejected";

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  sent_to_finance: "Sent to Finance",
  finance_approved: "Finance Approved",
  finance_rejected: "Finance Rejected",
  reopened: "Reopened",
  marketing_pending: "Marketing Pending",
  marketing_approved: "Marketing Approved",
  activated: "Activated",
  rejected: "Rejected",
};

export type MarketingStatus = "pending" | "approved" | "rejected";

export const MARKETING_STATUS_LABELS: Record<MarketingStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export type OperationalStatus =
  | "inactive"
  | "waiting_marketing_approval"
  | "active"
  | "suspended";

export const OPERATIONAL_STATUS_LABELS: Record<OperationalStatus, string> = {
  inactive: "Inactive",
  waiting_marketing_approval: "Waiting Marketing",
  active: "Active",
  suspended: "Suspended",
};

// ── Models ────────────────────────────────────────────────────────────────────

export interface VendorInvitation {
  id: string;
  org: string | null;
  scope_node: string;
  vendor_email: string;
  vendor_name_hint: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface VendorOnboardingSubmission {
  id: string;
  invitation: string;
  submission_mode: "manual" | "excel";
  status: SubmissionStatus;
  raw_form_data: Record<string, unknown>;
  normalized_vendor_name: string | null;
  normalized_vendor_type: string | null;
  normalized_email: string | null;
  normalized_phone: string | null;
  normalized_gst_registered: boolean | null;
  normalized_gstin: string | null;
  normalized_pan: string | null;
  normalized_address_line1: string | null;
  normalized_address_line2: string | null;
  normalized_city: string | null;
  normalized_state: string | null;
  normalized_country: string | null;
  normalized_pincode: string | null;
  normalized_bank_name: string | null;
  normalized_account_number: string | null;
  normalized_ifsc: string | null;
  has_source_excel: boolean;
  has_exported_excel: boolean;
  finance_sent_at: string | null;
  finance_vendor_code: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorAttachment {
  id: string;
  submission: string;
  document_type: string;
  title: string;
  file_name: string;
  file_url: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface Vendor {
  id: string;
  org: string;
  org_name: string;
  scope_node: string;
  scope_node_name: string;
  onboarding_submission: string | null;
  vendor_name: string;
  email: string;
  phone: string;
  sap_vendor_id: string | null;
  po_mandate_enabled: boolean;
  marketing_status: MarketingStatus;
  operational_status: OperationalStatus;
  approved_by_marketing: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Public finance token metadata ────────────────────────────────────────────

export interface PublicFinanceAttachment {
  id: string;
  title: string;
  file_name: string;
  document_type: string;
  download_url: string | null;
}

export interface PublicFinanceToken {
  action_type: "approve" | "reject";
  expires_at: string;
  is_expired: boolean;
  is_used: boolean;
  // Submission fields
  submission_id: number;
  submission_status: string;
  vendor_name: string | null;
  vendor_email: string | null;
  vendor_phone: string | null;
  vendor_type: string | null;
  gstin: string | null;
  pan: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc: string | null;
  // Safe file flags + download URLs (no raw filesystem paths)
  has_exported_excel: boolean;
  exported_excel_download_url: string | null;
  has_source_excel: boolean;
  source_excel_download_url: string | null;
  attachments: PublicFinanceAttachment[];
  reject_token: string | null;
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface CreateInvitationRequest {
  org: string;
  scope_node: string;
  vendor_email: string;
  vendor_name_hint?: string;
  expires_at?: string;
}

export interface ReopenSubmissionRequest {
  note?: string;
}

export interface MarketingApproveRequest {
  po_mandate_enabled?: boolean;
}

export interface MarketingRejectRequest {
  note?: string;
}

export interface ManualSubmissionRequest {
  data: Record<string, unknown>;
  finalize: boolean;
}

export interface AttachmentCreateRequest {
  title: string;
  document_type?: string;
}

export interface FinanceApproveRequest {
  sap_vendor_id: string;
  note?: string;
}

export interface FinanceRejectRequest {
  note?: string;
}

// ── Paginated responses ───────────────────────────────────────────────────────

export type InvitationListResponse = PaginatedResponse<VendorInvitation>;
export type SubmissionListResponse = PaginatedResponse<VendorOnboardingSubmission>;
export type AttachmentListResponse = PaginatedResponse<VendorAttachment>;
export type VendorListResponse = PaginatedResponse<Vendor>;