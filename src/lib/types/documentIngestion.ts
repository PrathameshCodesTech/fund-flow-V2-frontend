// ── Document Ingestion Types ─────────────────────────────────────────────────
// Matches NewBackend/apps/document_ingestion/api/serializers.py

import type { PaginatedResponse } from "./core";

// ── Status Enums ─────────────────────────────────────────────────────────────

export type ExternalDocumentStatus =
  | "discovered"
  | "downloaded"
  | "extracted"
  | "matched"
  | "review_required"
  | "applied"
  | "duplicate"
  | "quarantined"
  | "failed";

export const DOCUMENT_STATUS_LABELS: Record<ExternalDocumentStatus, string> = {
  discovered: "Discovered",
  downloaded: "Downloaded",
  extracted: "Extracted",
  matched: "Matched",
  review_required: "Review Required",
  applied: "Applied",
  duplicate: "Duplicate",
  quarantined: "Quarantined",
  failed: "Failed",
};

export const DOCUMENT_STATUS_COLORS: Record<ExternalDocumentStatus, string> = {
  discovered: "bg-slate-100 text-slate-700",
  downloaded: "bg-blue-100 text-blue-700",
  extracted: "bg-indigo-100 text-indigo-700",
  matched: "bg-emerald-100 text-emerald-700",
  review_required: "bg-amber-100 text-amber-700",
  applied: "bg-green-100 text-green-700",
  duplicate: "bg-orange-100 text-orange-700",
  quarantined: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
};

export type ExternalDocumentType = "unknown" | "invoice" | "payment_advice";

export const DOCUMENT_TYPE_LABELS: Record<ExternalDocumentType, string> = {
  unknown: "Unknown",
  invoice: "Invoice",
  payment_advice: "Payment Advice",
};

export type MatchStatus =
  | "not_attempted"
  | "matched"
  | "ambiguous"
  | "unmatched"
  | "conflict";

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  not_attempted: "Not Attempted",
  matched: "Matched",
  ambiguous: "Ambiguous",
  unmatched: "Unmatched",
  conflict: "Conflict",
};

export const MATCH_STATUS_COLORS: Record<MatchStatus, string> = {
  not_attempted: "bg-slate-100 text-slate-700",
  matched: "bg-green-100 text-green-700",
  ambiguous: "bg-amber-100 text-amber-700",
  unmatched: "bg-red-100 text-red-700",
  conflict: "bg-red-100 text-red-700",
};

// ── Event Types ──────────────────────────────────────────────────────────────

export type DocumentEventType =
  | "discovered"
  | "downloaded"
  | "extracted"
  | "matched"
  | "match_failed"
  | "applied"
  | "corrected"
  | "linked"
  | "reprocessed"
  | "quarantined"
  | "error";

export const EVENT_TYPE_LABELS: Record<DocumentEventType, string> = {
  discovered: "Discovered",
  downloaded: "Downloaded",
  extracted: "Extracted",
  matched: "Matched",
  match_failed: "Match Failed",
  applied: "Applied",
  corrected: "Corrected",
  linked: "Linked",
  reprocessed: "Reprocessed",
  quarantined: "Quarantined",
  error: "Error",
};

// ── Source ───────────────────────────────────────────────────────────────────

export interface ExternalDocumentSource {
  id: number;
  org: number;
  org_name: string;
  name: string;
  connector_type: string;
  is_active: boolean;
  last_polled_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Document Import (List) ───────────────────────────────────────────────────

export interface ExternalDocumentImportList {
  id: number;
  org: number;
  org_name: string;
  source: number | null;
  source_name: string | null;
  original_filename: string;
  content_type: string | null;
  file_size: number | null;
  content_hash: string;
  document_type: ExternalDocumentType;
  status: ExternalDocumentStatus;
  record_count: number;
  processing_attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

// ── Document Import (Detail) ─────────────────────────────────────────────────

export interface ExternalDocumentImportDetail extends ExternalDocumentImportList {
  download_url: string;
  raw_extracted_data: Record<string, unknown> | null;
  normalized_data: Record<string, unknown> | null;
  validation_errors: string[] | null;
  duplicate_of: number | null;
  discovered_at: string | null;
  downloaded_at: string | null;
  extracted_at: string | null;
  created_by: number | null;
  records: ExternalDocumentRecord[];
  events: ExternalDocumentEvent[];
}

// ── Document Record ──────────────────────────────────────────────────────────

export interface RecordNormalizedData {
  vendor_code?: string;
  vendor_name?: string;
  vendor_email?: string;
  gstin?: string;
  invoice_number?: string;
  sap_document_number?: string;
  amount?: string;
  currency?: string;
  payment_date?: string;
  utr_number?: string;
  payment_reference_number?: string;
  [key: string]: unknown;
}

export interface ExternalDocumentRecord {
  id: number;
  record_index: number;
  document_type: ExternalDocumentType;
  match_status: MatchStatus;
  raw_data: Record<string, unknown> | null;
  normalized_data: RecordNormalizedData | null;
  confidence_score: string | null; // DRF DecimalField returns strings
  validation_errors: string[] | null;
  matched_vendor: number | null;
  vendor_name: string | null;
  matched_invoice: number | null;
  invoice_title: string | null;
  applied_payment: number | null;
  matched_at: string | null;
  applied_at: string | null;
  reviewed_by: number | null;
  created_at: string;
  updated_at: string;
}

// ── Document Event ───────────────────────────────────────────────────────────

export interface ExternalDocumentEvent {
  id: number;
  event_type: string; // Extensible - backend event names not limited to union
  from_status: ExternalDocumentStatus | "" | null; // Backend allows blank strings
  to_status: ExternalDocumentStatus | "" | null; // Backend allows blank strings
  message: string | null;
  metadata: Record<string, unknown>;
  actor: number | null;
  actor_email: string | null;
  created_at: string;
}

// ── Counts Response (object maps, not arrays) ────────────────────────────────

export interface DocumentCountsResponse {
  total: number;
  by_status: Record<ExternalDocumentStatus, number>;
  by_document_type: Record<ExternalDocumentType, number>;
  records_by_match_status: Record<MatchStatus, number>;
}

// ── Filter Params ────────────────────────────────────────────────────────────

export interface DocumentImportFilters {
  org?: number;
  source?: number;
  status?: ExternalDocumentStatus;
  document_type?: ExternalDocumentType;
  page?: number;
  page_size?: number;
}

export interface DocumentRecordFilters {
  document?: number;
  match_status?: MatchStatus;
  document_type?: ExternalDocumentType;
  page?: number;
  page_size?: number;
}

// ── Request Types ────────────────────────────────────────────────────────────

export interface DocumentUploadRequest {
  org: number;
  file: File;
}

export interface DocumentCorrectionRequest {
  normalized_data: RecordNormalizedData;
  document_type?: ExternalDocumentType;
}

export interface DocumentLinkInvoiceRequest {
  invoice: number;
}

export interface DocumentQuarantineRequest {
  reason: string;
}

// ── Response Types ───────────────────────────────────────────────────────────

export type DocumentSourceListResponse = PaginatedResponse<ExternalDocumentSource>;
export type DocumentImportListResponse = PaginatedResponse<ExternalDocumentImportList>;
export type DocumentRecordListResponse = PaginatedResponse<ExternalDocumentRecord>;

// ── Invoice Search (for linking) ─────────────────────────────────────────────

export interface InvoiceSearchResult {
  id: number;
  title: string;
  vendor_name: string | null;
  amount: string;
  currency: string;
  status: string;
  po_number: string | null;
  vendor_invoice_number: string | null;
  created_at: string;
}
