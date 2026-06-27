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
  | "paid"
  | "historical_posted"
  | "historical_reversed";

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
  historical_posted: "Historical Posted",
  historical_reversed: "Historical Reversed",
};

// ── Invoice ──────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  scope_node: string;
  title: string;
  amount: string; // DecimalField → string
  currency: string;
  status: InvoiceStatus;
  entry_source?: "standard" | "historical_import";
  po_number: string;
  vendor: string | null;
  vendor_name?: string | null;
  finance_reference_number?: string;
  send_to_route_label?: string | null;
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
  can_record_payment?: boolean;
  historical_posting_reason?: string;
  historical_posted_by?: string | null;
  historical_posted_at?: string | null;
  historical_reversed_by?: string | null;
  historical_reversed_at?: string | null;
  historical_reversal_reason?: string;
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
  correction_requested_by: string | null;
  correction_requested_by_name: string;
  correction_requested_at: string | null;
  correction_note: string;
  send_to_route_id?: number | null;
  send_to_route_label?: string | null;
  scope_node: string;
  scope_node_name: string;
  status: SubmissionStatus;
  source_file_name: string;
  source_file_type: "pdf" | "xlsx" | "xls";
  confidence_score: number | null;
  confidence_percent: number | null;
  extraction_method?: "azure_document_intelligence" | "ocr" | "template" | "regex" | null;
  normalized_data: NormalizedInvoiceData;
  validation_errors: ValidationError[];
  final_invoice: string | null;
  final_invoice_id: string | null;
  final_invoice_status?: InvoiceStatus | null;
  final_invoice_title?: string | null;
  final_invoice_amount?: string | null;
  final_invoice_currency?: string | null;
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

export interface SubmissionSubmitRequest {
  send_to_option_id: number;
}

export interface SubmissionSubmitResponse {
  detail: string;
  invoice_id: string;
  invoice_status: string;
  submission_status: string;
  warnings?: Array<{ code: string; message: string }>;
}

export interface VendorSendToOption {
  id: number;
  code: string;
  label: string;
  display_order: number;
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
  submission: string | null;
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

export interface HistoricalBudgetOption {
  id: number;
  name: string;
  code: string;
  scope_node_id: number;
  scope_node_name: string;
  allocated_amount: string;
  available_amount: string;
  currency: string;
  reserved_amount: string;
  consumed_amount: string;
}

export interface HistoricalCategoryOption {
  id: number;
  name: string;
  code?: string;
}

export interface HistoricalSubcategoryOption {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
}

export interface HistoricalCampaignOption {
  id: number;
  name: string;
  code?: string;
}

export interface HistoricalBudgetLineOption {
  id: number;
  budget_id: number;
  category_id: number;
  category_name: string;
  subcategory_id: number | null;
  subcategory_name: string | null;
  allocated_amount: string;
  reserved_amount: string;
  consumed_amount: string;
  available_amount: string;
}

export interface HistoricalAllowedEntity {
  split_option_id?: number;
  entity_id: number;
  entity_name: string;
  business_unit_id?: number;
  business_unit_name?: string;
  node_type?: string;
  parent_entity_id?: number | null;
  parent_entity_name?: string | null;
  categories: HistoricalCategoryOption[];
  subcategories: HistoricalSubcategoryOption[];
  campaigns: HistoricalCampaignOption[];
  budgets: HistoricalBudgetOption[];
  budget_lines: HistoricalBudgetLineOption[];
  child_entities: HistoricalAllowedEntity[];
}

export interface HistoricalInvoiceOptions {
  vendor: {
    id: number;
    name: string;
    email: string;
    scope_node_id: number;
  };
  allowed_entities: HistoricalAllowedEntity[];
  rules: {
    currency: "INR";
    amount_required: boolean;
    document_required: boolean;
    allocation_total_policy: "MUST_EQUAL_INVOICE_TOTAL";
    workflow_bypassed: boolean;
  };
}

export interface HistoricalInvoiceAllocationInput {
  entity: number;
  budget: number;
  category: number;
  subcategory?: number | null;
  campaign?: number | null;
  amount: string;
  note?: string;
}

export interface HistoricalInvoicePostRequest {
  vendor: number;
  invoice_number: string;
  po_number?: string;
  finance_reference_number: string;
  invoice_date: string;
  amount: string;
  currency?: "INR";
  posting_reason?: string;
  allocations: HistoricalInvoiceAllocationInput[];
  document?: File | null;
}

export interface HistoricalInvoicePreviewAllocation {
  entity_id: number;
  entity_name: string;
  budget_id: number;
  budget_name: string;
  budget_line_id: number;
  category_id: number;
  category_name: string;
  subcategory_id: number | null;
  subcategory_name: string | null;
  campaign_id: number | null;
  campaign_name: string | null;
  amount: string;
  available_before: string;
  available_after: string;
}

export interface HistoricalInvoicePreview {
  vendor: {
    id: number;
    name: string;
    email: string;
  };
  invoice_number: string;
  invoice_amount: string;
  currency: string;
  allocation_total: string;
  allocations: HistoricalInvoicePreviewAllocation[];
}

export interface HistoricalInvoicePostResponse {
  invoice: Invoice;
  allocations: unknown[];
  consumptions: unknown[];
  document: InvoiceDocument | null;
}

export interface HistoricalInvoiceReverseRequest {
  reason: string;
}

export interface HistoricalInvoiceReverseResponse {
  invoice: Invoice;
  adjustments: unknown[];
}

// ── Paginated response ────────────────────────────────────────────────────────

export type InvoiceListResponse = PaginatedResponse<Invoice>;
