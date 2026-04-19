// ── V2 Invoice Types ─────────────────────────────────────────────────────────
// Reflects NewBackend/apps/invoices/api/serializers/__init__.py (InvoiceSerializer)

import type { PaginatedResponse } from "./core";

// ── Status ────────────────────────────────────────────────────────────────────

export type InvoiceStatus =
  | "draft"
  | "pending_workflow"
  | "pending"
  | "in_review"
  | "internally_approved"
  | "finance_pending"
  | "finance_approved"
  | "finance_rejected"
  | "rejected"
  | "paid";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  pending_workflow: "Pending Workflow",
  pending: "Pending",
  in_review: "In Review",
  internally_approved: "Internally Approved",
  finance_pending: "Finance Pending",
  finance_approved: "Finance Approved",
  finance_rejected: "Finance Rejected",
  rejected: "Rejected",
  paid: "Paid",
};

// ── Invoice ──────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  scope_node: string;
  title: string;
  amount: string; // DecimalField → string
  currency: string;
  status: InvoiceStatus;
  po_number: string;
  vendor: string | null;
  vendor_invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  subtotal_amount?: string;
  tax_amount?: string;
  description?: string;
  selected_workflow_template: string | null;
  selected_workflow_version: string | null;
  selected_workflow_template_name?: string | null;
  selected_workflow_version_number?: number | null;
  workflow_selected_by?: string | null;
  workflow_selected_by_name?: string | null;
  workflow_selected_at?: string | null;
  workflow_instance_id?: number | null;
  workflow_instance_status?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ── Vendor Invoice Submission ─────────────────────────────────────────────────

export type SubmissionStatus =
  | "uploaded"
  | "extracting"
  | "needs_correction"
  | "ready"
  | "submitted"
  | "rejected"
  | "cancelled";

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  uploaded: "Uploaded",
  extracting: "Extracting",
  needs_correction: "Needs Correction",
  ready: "Ready to Submit",
  submitted: "Submitted",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export interface NormalizedInvoiceData {
  vendor_invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  currency?: string;
  subtotal_amount?: string;
  tax_amount?: string;
  total_amount?: string;
  po_number?: string;
  description?: string;
  [key: string]: string | undefined;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface VendorInvoiceSubmission {
  id: string;
  vendor: string;
  vendor_name: string;
  submitted_by: string;
  submitted_by_name: string;
  scope_node: string;
  scope_node_name: string;
  status: SubmissionStatus;
  source_file_name: string;
  source_file_type: "pdf" | "xlsx" | "xls";
  confidence_score: number | null;
  confidence_percent: number | null;
  normalized_data: NormalizedInvoiceData;
  validation_errors: ValidationError[];
  final_invoice: string | null;
  final_invoice_id: string | null;
  documents: SubmissionDocument[];
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
}

export interface SubmissionDocument {
  id: string;
  file_name: string;
  file_type: string;
  document_type: string;
  created_at: string;
}

export interface SubmissionCreateRequest {
  scope_node: string;
  source_file: File;
  normalized_data?: NormalizedInvoiceData;
}

export interface SubmissionExtractResponse {
  status: SubmissionStatus;
  confidence: number;
  confidence_percent: number;
  normalized_data: NormalizedInvoiceData;
  validation_errors: ValidationError[];
  warnings: string[];
  errors: string[];
}

export interface SubmissionUpdateRequest {
  normalized_data: NormalizedInvoiceData;
}

// ── Invoice Document ──────────────────────────────────────────────────────────

export type DocumentType =
  | "invoice_pdf"
  | "invoice_excel"
  | "po_copy"
  | "delivery_challan"
  | "tax_document"
  | "supporting_document";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice_pdf: "Invoice PDF",
  invoice_excel: "Invoice Excel",
  po_copy: "PO Copy",
  delivery_challan: "Delivery Challan",
  tax_document: "Tax Document",
  supporting_document: "Supporting Document",
};

export interface InvoiceDocument {
  id: string;
  invoice: string | null;
  submission: string;
  file_name: string;
  file_type: string;
  document_type: DocumentType;
  download_url: string;
  uploaded_by: string;
  created_at: string;
}

export interface InvoiceDocumentCreateRequest {
  file: File;
  document_type: DocumentType;
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface CreateInvoiceRequest {
  scope_node: string;
  title: string;
  amount: string;
  currency?: string;
  po_number?: string;
  vendor?: string;
}

export interface UpdateInvoiceRequest {
  title?: string;
  amount?: string;
  currency?: string;
  po_number?: string;
}

// ── Paginated response ────────────────────────────────────────────────────────

export type InvoiceListResponse = PaginatedResponse<Invoice>;
