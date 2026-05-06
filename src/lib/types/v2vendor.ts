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

// ── Vendor attachment document types (mirrors ALLOWED_ATTACHMENT_DOCUMENT_TYPES in backend) ──

export const VENDOR_ATTACHMENT_DOC_TYPES = [
  { value: "msme_declaration_form", label: "MSME Declaration Form" },
  { value: "msme_registration_certificate", label: "MSME Registration Certificate (UDYAM)" },
  { value: "cancelled_cheque", label: "Cancelled Cheque" },
  { value: "pan_copy", label: "PAN Copy" },
  { value: "gst_certificate", label: "GST Certificate" },
  { value: "bank_proof", label: "Bank Proof / Statement" },
  { value: "supporting_document", label: "Supporting Document" },
] as const;

export type VendorAttachmentDocType = (typeof VENDOR_ATTACHMENT_DOC_TYPES)[number]["value"];

// ── Models ────────────────────────────────────────────────────────────────────

export interface VendorInvitation {
  id: string;
  org: string | null;
  scope_node: string;
  scope_node_name: string;
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
  // Core identity
  normalized_title: string | null;
  normalized_vendor_name: string | null;
  normalized_vendor_type: string | null;
  normalized_email: string | null;
  normalized_phone: string | null;
  normalized_fax: string | null;
  normalized_gst_registered: boolean | null;
  normalized_gstin: string | null;
  normalized_pan: string | null;
  normalized_region: string | null;
  normalized_head_office_no: string | null;
  // Address
  normalized_address_line1: string | null;
  normalized_address_line2: string | null;
  normalized_address_line3: string | null;
  normalized_city: string | null;
  normalized_state: string | null;
  normalized_country: string | null;
  normalized_pincode: string | null;
  // Bank core
  normalized_preferred_payment_mode: string | null;
  normalized_beneficiary_name: string | null;
  normalized_bank_name: string | null;
  normalized_account_number: string | null;
  normalized_bank_account_type: string | null;
  normalized_ifsc: string | null;
  normalized_micr_code: string | null;
  normalized_neft_code: string | null;
  // Bank branch contact
  normalized_bank_branch_address_line1: string | null;
  normalized_bank_branch_address_line2: string | null;
  normalized_bank_branch_city: string | null;
  normalized_bank_branch_state: string | null;
  normalized_bank_branch_country: string | null;
  normalized_bank_branch_pincode: string | null;
  normalized_bank_phone: string | null;
  normalized_bank_fax: string | null;
  // MSME / compliance
  normalized_authorized_signatory_name: string | null;
  normalized_msme_registered: boolean | null;
  normalized_msme_registration_number: string | null;
  normalized_msme_enterprise_type: string | null;
  declaration_accepted: boolean | null;
  // JSON blocks
  contact_persons_json: ContactPerson[] | null;
  head_office_address_json: HeadOfficeAddress | null;
  tax_registration_details_json: TaxRegistrationDetails | null;
  // File tracking
  has_source_excel: boolean;
  has_exported_excel: boolean;
  finance_sent_at: string | null;
  finance_vendor_code: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  // Supporting documents (populated for draft re-entry restoration)
  attachments: Array<{
    id: string;
    title: string;
    file_name: string;
    document_type: string;
  }>;
}

// JSON block shapes
export interface ContactPerson {
  type: string;
  name: string;
  designation: string;
  email: string;
  telephone: string;
}

export interface HeadOfficeAddress {
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
  fax: string;
}

export interface TaxRegistrationDetails {
  tax_registration_nos: string;
  tin_no: string;
  cst_no: string;
  lst_no: string;
  esic_reg_no: string;
  pan_ref_no: string;
  ppf_no: string;
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
  // Approved live profile fields (canonical source of truth — not on onboarding submission)
  title: string;
  vendor_type: string;
  fax: string;
  region: string;
  head_office_no: string;
  gst_registered: boolean | null;
  gstin: string;
  pan: string;
  address_line1: string;
  address_line2: string;
  address_line3: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  preferred_payment_mode: string;
  beneficiary_name: string;
  bank_name: string;
  account_number: string;
  bank_account_type: string;
  ifsc: string;
  micr_code: string;
  neft_code: string;
  bank_branch_address_line1: string;
  bank_branch_address_line2: string;
  bank_branch_city: string;
  bank_branch_state: string;
  bank_branch_country: string;
  bank_branch_pincode: string;
  bank_phone: string;
  bank_fax: string;
  authorized_signatory_name: string;
  msme_registered: boolean | null;
  msme_registration_number: string;
  msme_enterprise_type: string;
  declaration_accepted: boolean | null;
  contact_persons_json: unknown[];
  head_office_address_json: Record<string, unknown>;
  tax_registration_details_json: Record<string, unknown>;
  // System fields
  sap_vendor_id: string | null;
  po_mandate_enabled: boolean;
  marketing_status: MarketingStatus;
  operational_status: OperationalStatus;
  approved_by_marketing: string | null;
  approved_at: string | null;
  profile_change_pending: boolean;
  profile_hold_reason: string;
  active_profile_revision: number | null;
  profile_hold_started_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Profile Revision ─────────────────────────────────────────────────────────

export interface VendorSubmissionRoute {
  id: string;
  org: string;
  code: string;
  label: string;
  description: string;
  display_order: number;
  is_active: boolean;
  workflow_template: string;
  workflow_template_name: string;
  workflow_template_code: string;
  published_version_id: string | null;
  published_version_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVendorSubmissionRouteRequest {
  org: string;
  code: string;
  label: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
  workflow_template: string;
}

export interface UpdateVendorSubmissionRouteRequest {
  label?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
  workflow_template?: string;
}

export type ProfileRevisionStatus =
  | "draft"
  | "submitted"
  | "finance_approved"
  | "finance_rejected"
  | "reopened"
  | "applied"
  | "cancelled";

export const PROFILE_REVISION_STATUS_LABELS: Record<ProfileRevisionStatus, string> = {
  draft: "Draft",
  submitted: "Pending Finance Review",
  finance_approved: "Finance Approved",
  finance_rejected: "Finance Rejected",
  reopened: "Reopened",
  applied: "Applied",
  cancelled: "Cancelled",
};

export interface VendorProfileRevision {
  id: number;
  vendor: number;
  revision_number: number;
  status: ProfileRevisionStatus;
  proposed_snapshot_json: Record<string, unknown>;
  changed_fields_json: string[];
  source_revision_snapshot_json: Record<string, unknown>;
  finance_sent_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  applied_at: string | null;
  created_by: number | null;
  created_by_name: string | null;
  updated_by: number | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorProfileSnapshot {
  vendor_id: number;
  vendor_name: string;
  profile_change_pending: boolean;
  profile_hold_reason: string;
  snapshot: Record<string, unknown>;
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
  title: string | null;
  vendor_name: string | null;
  vendor_email: string | null;
  vendor_phone: string | null;
  fax: string | null;
  vendor_type: string | null;
  gst_registered: boolean | null;
  gstin: string | null;
  pan: string | null;
  region: string | null;
  head_office_no: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  preferred_payment_mode: string | null;
  beneficiary_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  bank_account_type: string | null;
  ifsc: string | null;
  micr_code: string | null;
  neft_code: string | null;
  bank_branch_address_line1: string | null;
  bank_branch_address_line2: string | null;
  bank_branch_city: string | null;
  bank_branch_state: string | null;
  bank_branch_country: string | null;
  bank_branch_pincode: string | null;
  bank_phone: string | null;
  bank_fax: string | null;
  msme_registered: boolean | null;
  msme_registration_number: string | null;
  msme_enterprise_type: string | null;
  authorized_signatory_name: string | null;
  contact_persons_json: Array<{
    type?: string;
    name?: string;
    designation?: string;
    email?: string;
    telephone?: string;
  }> | null;
  head_office_address_json: {
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    phone?: string;
    fax?: string;
  } | null;
  tax_registration_details_json: {
    tax_registration_nos?: string;
    tin_no?: string;
    cst_no?: string;
    lst_no?: string;
    esic_reg_no?: string;
    pan_ref_no?: string;
    ppf_no?: string;
  } | null;
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
