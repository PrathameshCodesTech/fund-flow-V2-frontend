import { apiClient } from "./client";
import type {
  Invoice, InvoiceListResponse, CreateInvoiceRequest,
  VendorInvoiceSubmission, SubmissionCreateRequest,
  SubmissionExtractResponse, SubmissionUpdateRequest,
  InvoiceDocument, InvoiceDocumentCreateRequest,
} from "../types/v2invoice";

// ── Invoice List ─────────────────────────────────────────────────────────────

export function listInvoices(params?: {
  scope_node?: string;
  status?: string;
}): Promise<InvoiceListResponse> {
  return apiClient.get<InvoiceListResponse>("/api/v1/invoices/", params);
}

// ── Invoice Detail ────────────────────────────────────────────────────────────

export function getInvoice(id: string): Promise<Invoice> {
  return apiClient.get<Invoice>(`/api/v1/invoices/${id}/`);
}

// ── Invoice Create ────────────────────────────────────────────────────────────

export function createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
  return apiClient.post<Invoice>("/api/v1/invoices/", data);
}

export function submitInvoice(id: string): Promise<Invoice> {
  return apiClient.post<Invoice>(`/api/v1/invoices/${id}/submit/`, {});
}

// ── Invoice Update ────────────────────────────────────────────────────────────

export function updateInvoice(
  id: string,
  data: Partial<CreateInvoiceRequest>,
): Promise<Invoice> {
  return apiClient.patch<Invoice>(`/api/v1/invoices/${id}/`, data);
}

// ── Vendor Invoice Submissions ────────────────────────────────────────────────

export function listSubmissions(params?: {
  status?: string;
}): Promise<VendorInvoiceSubmission[]> {
  return apiClient.get<VendorInvoiceSubmission[]>("/api/v1/invoices/vendor-invoice-submissions/", params);
}

export function getSubmission(id: string): Promise<VendorInvoiceSubmission> {
  return apiClient.get<VendorInvoiceSubmission>(`/api/v1/invoices/vendor-invoice-submissions/${id}/`);
}

export function createSubmission(
  data: SubmissionCreateRequest,
): Promise<VendorInvoiceSubmission> {
  const fd = new FormData();
  fd.append("scope_node", data.scope_node);
  fd.append("source_file", data.source_file);
  if (data.normalized_data) {
    fd.append("normalized_data", JSON.stringify(data.normalized_data));
  }
  return apiClient.multipart<VendorInvoiceSubmission>(
    "/api/v1/invoices/vendor-invoice-submissions/",
    fd,
  );
}

export function extractSubmission(
  id: string,
): Promise<SubmissionExtractResponse> {
  return apiClient.post<SubmissionExtractResponse>(
    `/api/v1/invoices/vendor-invoice-submissions/${id}/extract/`,
    {},
  );
}

export function updateSubmissionFields(
  id: string,
  data: SubmissionUpdateRequest,
): Promise<VendorInvoiceSubmission> {
  return apiClient.patch<VendorInvoiceSubmission>(
    `/api/v1/invoices/vendor-invoice-submissions/${id}/`,
    data,
  );
}

export function submitSubmission(
  id: string,
): Promise<{ detail: string; invoice_id: string; submission_status: string }> {
  return apiClient.post(
    `/api/v1/invoices/vendor-invoice-submissions/${id}/submit/`,
    {},
  );
}

export function cancelSubmission(
  id: string,
): Promise<VendorInvoiceSubmission> {
  return apiClient.post<VendorInvoiceSubmission>(
    `/api/v1/invoices/vendor-invoice-submissions/${id}/cancel/`,
    {},
  );
}

export function addSubmissionDocument(
  submissionId: string,
  data: InvoiceDocumentCreateRequest,
): Promise<InvoiceDocument> {
  const fd = new FormData();
  fd.append("file", data.file);
  fd.append("document_type", data.document_type);
  return apiClient.multipart<InvoiceDocument>(
    `/api/v1/invoices/vendor-invoice-submissions/${submissionId}/documents/`,
    fd,
  );
}

export function getDocument(id: string): Promise<InvoiceDocument> {
  return apiClient.get<InvoiceDocument>(`/api/v1/invoices/invoice-documents/${id}/`);
}

// ── Invoice Workflow Attachment ────────────────────────────────────────────────

export interface EligibleWorkflowVersion {
  template_id: number;
  template_name: string;
  version_id: number;
  version_number: number;
  scope_node: number;
  scope_node_name: string;
  module: string;
}

export function listEligibleWorkflows(
  invoiceId: string,
): Promise<EligibleWorkflowVersion[]> {
  return apiClient.get<EligibleWorkflowVersion[]>(
    `/api/v1/invoices/${invoiceId}/eligible-workflows/`,
  );
}

export interface AttachWorkflowRequest {
  template_version_id: number;
  activate?: boolean;
}

export function attachWorkflow(
  invoiceId: string,
  data: AttachWorkflowRequest,
): Promise<{
  invoice: Invoice;
  workflow_instance: { id: number; status: string; template_version_id: number };
}> {
  return apiClient.post(`/api/v1/invoices/${invoiceId}/attach-workflow/`, data);
}
