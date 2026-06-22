import { apiClient } from "./client";
import type {
  DocumentImportListResponse,
  DocumentSourceListResponse,
  DocumentCountsResponse,
  DocumentImportFilters,
  DocumentCorrectionRequest,
  DocumentLinkInvoiceRequest,
  DocumentQuarantineRequest,
  ExternalDocumentImportList,
  ExternalDocumentImportDetail,
  ExternalDocumentRecord,
} from "../types/documentIngestion";

const BASE_PATH = "/api/v1/document-ingestion";

// ── Sources (paginated) ──────────────────────────────────────────────────────

/** Fetch a single page of sources. Pass a full URL for pagination `next` links. */
export function listDocumentSourcesPage(
  nextUrl?: string | null,
): Promise<DocumentSourceListResponse> {
  if (nextUrl) {
    return apiClient.getUrl<DocumentSourceListResponse>(nextUrl);
  }
  return apiClient.get<DocumentSourceListResponse>(`${BASE_PATH}/sources/`);
}

// ── Document Imports ─────────────────────────────────────────────────────────

export function listDocumentImports(
  params?: DocumentImportFilters,
): Promise<DocumentImportListResponse> {
  return apiClient.get<DocumentImportListResponse>(`${BASE_PATH}/documents/`, params);
}

export function getDocumentImport(id: number): Promise<ExternalDocumentImportDetail> {
  return apiClient.get<ExternalDocumentImportDetail>(`${BASE_PATH}/documents/${id}/`);
}

/** Counts endpoint - accepts org, source, document_type (status intentionally excluded) */
export function getDocumentCounts(
  params?: Pick<DocumentImportFilters, "org" | "source" | "document_type">,
): Promise<DocumentCountsResponse> {
  return apiClient.get<DocumentCountsResponse>(`${BASE_PATH}/documents/counts/`, params);
}

/** Download using the download_url from document detail */
export async function downloadDocumentBlob(downloadUrl: string): Promise<Blob> {
  return apiClient.blob(downloadUrl);
}

/** Upload document - requires org (not source) */
export function uploadDocument(
  orgId: number,
  file: File,
): Promise<ExternalDocumentImportDetail> {
  const formData = new FormData();
  formData.append("org", String(orgId));
  formData.append("file", file);
  return apiClient.multipart<ExternalDocumentImportDetail>(`${BASE_PATH}/documents/upload/`, formData);
}

export function processDocument(
  id: number,
  force?: boolean,
): Promise<ExternalDocumentImportDetail> {
  return apiClient.post<ExternalDocumentImportDetail>(
    `${BASE_PATH}/documents/${id}/process/`,
    force ? { force: true } : {},
  );
}

export function matchDocument(id: number): Promise<ExternalDocumentImportDetail> {
  return apiClient.post<ExternalDocumentImportDetail>(`${BASE_PATH}/documents/${id}/match/`, {});
}

export function quarantineDocument(
  id: number,
  data: DocumentQuarantineRequest,
): Promise<ExternalDocumentImportDetail> {
  return apiClient.post<ExternalDocumentImportDetail>(`${BASE_PATH}/documents/${id}/quarantine/`, data);
}

// ── Document Records ─────────────────────────────────────────────────────────

export function getDocumentRecord(id: number): Promise<ExternalDocumentRecord> {
  return apiClient.get<ExternalDocumentRecord>(`${BASE_PATH}/records/${id}/`);
}

/** Correct record - POST with normalized_data (not PATCH) */
export function correctDocumentRecord(
  id: number,
  data: DocumentCorrectionRequest,
): Promise<ExternalDocumentRecord> {
  return apiClient.post<ExternalDocumentRecord>(`${BASE_PATH}/records/${id}/correct/`, data);
}

/** Link record to invoice - uses `invoice` field (not invoice_id) */
export function linkDocumentRecord(
  id: number,
  data: DocumentLinkInvoiceRequest,
): Promise<ExternalDocumentRecord> {
  return apiClient.post<ExternalDocumentRecord>(`${BASE_PATH}/records/${id}/link-invoice/`, data);
}

/** Apply payment from record to matched invoice */
export function applyPaymentRecord(id: number): Promise<ExternalDocumentRecord> {
  return apiClient.post<ExternalDocumentRecord>(`${BASE_PATH}/records/${id}/apply-payment/`, {});
}
