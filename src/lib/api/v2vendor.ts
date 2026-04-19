// ── V2 Vendor API ─────────────────────────────────────────────────────────────────
// Base path: /api/v1/vendors/

import { apiClient } from "./client";
import type {
  VendorInvitation,
  VendorOnboardingSubmission,
  VendorAttachment,
  Vendor,
  PublicFinanceToken,
  CreateInvitationRequest,
  ReopenSubmissionRequest,
  MarketingApproveRequest,
  MarketingRejectRequest,
  ManualSubmissionRequest,
  AttachmentCreateRequest,
  FinanceApproveRequest,
  FinanceRejectRequest,
  InvitationListResponse,
  SubmissionListResponse,
  AttachmentListResponse,
  VendorListResponse,
} from "../types/v2vendor";

// ── Internal: Invitations ─────────────────────────────────────────────────────

export async function listInvitations(params?: {
  org?: string;
  scope_node?: string;
  status?: string;
  vendor_email?: string;
}): Promise<InvitationListResponse> {
  return apiClient.get("/api/v1/vendors/invitations/", params);
}

export async function getInvitation(id: string): Promise<VendorInvitation> {
  return apiClient.get(`/api/v1/vendors/invitations/${id}/`);
}

export async function createInvitation(
  data: CreateInvitationRequest,
): Promise<VendorInvitation> {
  return apiClient.post("/api/v1/vendors/invitations/", data);
}

export async function cancelInvitation(id: string): Promise<VendorInvitation> {
  return apiClient.post(`/api/v1/vendors/invitations/${id}/cancel/`);
}

// ── Internal: Submissions ──────────────────────────────────────────────────────

export async function listSubmissions(params?: {
  org?: string;
  scope_node?: string;
  status?: string;
  invitation?: string;
  normalized_vendor_name?: string;
  normalized_email?: string;
}): Promise<SubmissionListResponse> {
  return apiClient.get("/api/v1/vendors/submissions/", params);
}

export async function getSubmission(id: string): Promise<VendorOnboardingSubmission> {
  return apiClient.get(`/api/v1/vendors/submissions/${id}/`);
}

export async function sendToFinance(id: string): Promise<VendorOnboardingSubmission> {
  return apiClient.post(`/api/v1/vendors/submissions/${id}/send-to-finance/`);
}

export async function reopenSubmission(
  id: string,
  data?: ReopenSubmissionRequest,
): Promise<VendorOnboardingSubmission> {
  return apiClient.post(`/api/v1/vendors/submissions/${id}/reopen/`, data ?? {});
}

// ── Internal: Attachments ─────────────────────────────────────────────────────

export async function listAttachments(params?: {
  submission?: string;
}): Promise<AttachmentListResponse> {
  return apiClient.get("/api/v1/vendors/attachments/", params);
}

export async function getAttachment(id: string): Promise<VendorAttachment> {
  return apiClient.get(`/api/v1/vendors/attachments/${id}/`);
}

// ── Internal: Vendors ──────────────────────────────────────────────────────────

export async function listVendors(params?: {
  org?: string;
  scope_node?: string;
  operational_status?: string;
  marketing_status?: string;
  po_mandate_enabled?: string;
}): Promise<VendorListResponse> {
  return apiClient.get("/api/v1/vendors/", params);
}

export async function getVendor(id: string): Promise<Vendor> {
  return apiClient.get(`/api/v1/vendors/${id}/`);
}

export async function getMyVendor(): Promise<Vendor> {
  return apiClient.get("/api/v1/vendors/my-vendor/");
}

export async function updateVendor(
  id: string,
  data: Partial<Pick<Vendor, "email" | "phone" | "po_mandate_enabled">>,
): Promise<Vendor> {
  return apiClient.patch(`/api/v1/vendors/${id}/`, data);
}

export async function marketingApprove(
  id: string,
  data?: MarketingApproveRequest,
): Promise<Vendor> {
  return apiClient.post(`/api/v1/vendors/${id}/marketing-approve/`, data ?? {});
}

export async function marketingReject(
  id: string,
  data?: MarketingRejectRequest,
): Promise<Vendor> {
  return apiClient.post(`/api/v1/vendors/${id}/marketing-reject/`, data ?? {});
}

export interface ResendActivationResponse {
  detail: string;
  vendor_id: string;
  email: string;
  user_created: boolean;
  assignment_created: boolean;
  token_created: boolean;
}

export async function resendVendorActivation(id: string): Promise<ResendActivationResponse> {
  return apiClient.post(`/api/v1/vendors/${id}/resend-activation/`);
}

// ── Public: Invitation token ───────────────────────────────────────────────────

export async function getPublicInvitation(token: string): Promise<VendorInvitation> {
  return apiClient.get(`/api/v1/vendors/public/invitations/${token}/`);
}

export async function submitManual(
  token: string,
  data: ManualSubmissionRequest,
): Promise<VendorOnboardingSubmission> {
  return apiClient.post(
    `/api/v1/vendors/public/invitations/${token}/submit-manual/`,
    data,
  );
}

export async function submitExcel(
  token: string,
  file: File,
  finalize?: boolean,
): Promise<VendorOnboardingSubmission> {
  const fd = new FormData();
  fd.append("file", file);
  if (finalize) fd.append("finalize", "true");
  return apiClient.multipart<VendorOnboardingSubmission>(
    `/api/v1/vendors/public/invitations/${token}/submit-excel/`,
    fd,
  );
}

export async function addAttachment(
  token: string,
  file: File,
  title: string,
  documentType?: string,
): Promise<VendorAttachment> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("title", title);
  if (documentType) fd.append("document_type", documentType);
  return apiClient.multipart<VendorAttachment>(
    `/api/v1/vendors/public/invitations/${token}/attachments/`,
    fd,
  );
}

export async function finalizeInvitation(
  token: string,
): Promise<VendorOnboardingSubmission> {
  return apiClient.post(`/api/v1/vendors/public/invitations/${token}/finalize/`);
}

// ── Public: Finance action token ──────────────────────────────────────────────

export async function getFinanceToken(token: string): Promise<PublicFinanceToken> {
  return apiClient.get(`/api/v1/vendors/public/finance/${token}/`);
}

export async function financeApprove(
  token: string,
  data: FinanceApproveRequest,
): Promise<{ submission: VendorOnboardingSubmission; vendor: Vendor }> {
  return apiClient.post(`/api/v1/vendors/public/finance/${token}/approve/`, data);
}

export async function financeReject(
  token: string,
  data: FinanceRejectRequest,
): Promise<VendorOnboardingSubmission> {
  return apiClient.post(`/api/v1/vendors/public/finance/${token}/reject/`, data);
}
