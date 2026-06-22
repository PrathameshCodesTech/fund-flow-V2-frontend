import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listDocumentSourcesPage,
  listDocumentImports,
  getDocumentImport,
  getDocumentCounts,
  downloadDocumentBlob,
  uploadDocument,
  processDocument,
  matchDocument,
  quarantineDocument,
  getDocumentRecord,
  correctDocumentRecord,
  linkDocumentRecord,
  applyPaymentRecord,
} from "../api/documentIngestion";
import type { ExternalDocumentSource } from "../types/documentIngestion";
import type {
  DocumentImportFilters,
  DocumentCorrectionRequest,
  DocumentLinkInvoiceRequest,
  DocumentQuarantineRequest,
} from "../types/documentIngestion";

// ── Query Keys ───────────────────────────────────────────────────────────────

export const documentIngestionKeys = {
  all: ["v2", "document-ingestion"] as const,
  sources: () => [...documentIngestionKeys.all, "sources"] as const,
  documents: () => [...documentIngestionKeys.all, "documents"] as const,
  documentList: (params?: DocumentImportFilters) =>
    [...documentIngestionKeys.documents(), "list", params] as const,
  documentDetail: (id: number) =>
    [...documentIngestionKeys.documents(), "detail", id] as const,
  documentCounts: (params?: Pick<DocumentImportFilters, "org" | "source" | "document_type">) =>
    [...documentIngestionKeys.documents(), "counts", params] as const,
  records: () => [...documentIngestionKeys.all, "records"] as const,
  recordDetail: (id: number) =>
    [...documentIngestionKeys.records(), "detail", id] as const,
};

// Polling interval for queue (30 seconds)
const POLLING_INTERVAL = 30_000;

// ── Sources (paginated - fetch all pages) ───────────────────────────────────

export function useDocumentSources() {
  return useQuery({
    queryKey: documentIngestionKeys.sources(),
    queryFn: async () => {
      // Fetch all pages by following `next` links
      const allSources: ExternalDocumentSource[] = [];
      const seenIds = new Set<number>();

      let nextUrl: string | null = null;
      let isFirstPage = true;

      while (isFirstPage || nextUrl) {
        const response = await listDocumentSourcesPage(isFirstPage ? undefined : nextUrl);
        isFirstPage = false;

        // Add sources, preventing duplicates by ID
        for (const source of response.results) {
          if (!seenIds.has(source.id)) {
            seenIds.add(source.id);
            allSources.push(source);
          }
        }

        nextUrl = response.next;
      }

      return allSources;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ── Document Imports ─────────────────────────────────────────────────────────

export function useDocumentImports(
  params?: DocumentImportFilters,
  options?: { polling?: boolean },
) {
  return useQuery({
    queryKey: documentIngestionKeys.documentList(params),
    queryFn: () => listDocumentImports(params),
    refetchInterval: options?.polling ? POLLING_INTERVAL : false,
  });
}

export function useDocumentImport(id: number | null) {
  return useQuery({
    queryKey: documentIngestionKeys.documentDetail(id!),
    queryFn: () => getDocumentImport(id!),
    enabled: id !== null,
  });
}

/** Counts with filters (org, source, document_type). Status is intentionally excluded. */
export function useDocumentCounts(
  params?: Pick<DocumentImportFilters, "org" | "source" | "document_type">,
  options?: { polling?: boolean },
) {
  return useQuery({
    queryKey: documentIngestionKeys.documentCounts(params),
    queryFn: () => getDocumentCounts(params),
    refetchInterval: options?.polling ? POLLING_INTERVAL : false,
  });
}

// ── Document Download ────────────────────────────────────────────────────────

export function useDownloadDocument() {
  return useMutation({
    mutationFn: async ({
      downloadUrl,
      filename,
    }: {
      downloadUrl: string;
      filename: string;
    }) => {
      const blob = await downloadDocumentBlob(downloadUrl);
      const objectUrl = URL.createObjectURL(blob);
      // Trigger download with original filename
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Revoke after download
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    },
  });
}

// ── Document Upload (uses org, not source) ───────────────────────────────────

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, file }: { orgId: number; file: File }) =>
      uploadDocument(orgId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentIngestionKeys.documents() });
    },
  });
}

// ── Document Process ─────────────────────────────────────────────────────────

export function useProcessDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force }: { id: number; force?: boolean }) =>
      processDocument(id, force),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: documentIngestionKeys.documentDetail(id) });
      queryClient.invalidateQueries({ queryKey: documentIngestionKeys.documents() });
    },
  });
}

// ── Document Match (also used for rematch) ───────────────────────────────────

export function useMatchDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: matchDocument,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: documentIngestionKeys.documentDetail(id) });
      queryClient.invalidateQueries({ queryKey: documentIngestionKeys.documents() });
    },
  });
}

// ── Document Quarantine ──────────────────────────────────────────────────────

export function useQuarantineDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DocumentQuarantineRequest }) =>
      quarantineDocument(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: documentIngestionKeys.documentDetail(id) });
      queryClient.invalidateQueries({ queryKey: documentIngestionKeys.documents() });
    },
  });
}

// ── Document Records ─────────────────────────────────────────────────────────

export function useDocumentRecord(id: number | null) {
  return useQuery({
    queryKey: documentIngestionKeys.recordDetail(id!),
    queryFn: () => getDocumentRecord(id!),
    enabled: id !== null,
  });
}

// ── Record Correction (POST with normalized_data) ────────────────────────────

export function useCorrectRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      documentId,
      data,
    }: {
      id: number;
      documentId: number;
      data: DocumentCorrectionRequest;
    }) => correctDocumentRecord(id, data),
    onSuccess: (_data, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: documentIngestionKeys.documentDetail(documentId) });
      queryClient.invalidateQueries({ queryKey: documentIngestionKeys.documents() });
    },
  });
}

// ── Record Link Invoice (uses `invoice` field) ──────────────────────────────

export function useLinkRecordInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      documentId,
      data,
    }: {
      id: number;
      documentId: number;
      data: DocumentLinkInvoiceRequest;
    }) => linkDocumentRecord(id, data),
    onSuccess: (_data, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: documentIngestionKeys.documentDetail(documentId) });
      queryClient.invalidateQueries({ queryKey: documentIngestionKeys.documents() });
      queryClient.invalidateQueries({ queryKey: ["v2", "invoices"] });
    },
  });
}

// ── Record Apply Payment ─────────────────────────────────────────────────────

export function useApplyPaymentRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, documentId }: { id: number; documentId: number }) =>
      applyPaymentRecord(id),
    onSuccess: (_data, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: documentIngestionKeys.documentDetail(documentId) });
      queryClient.invalidateQueries({ queryKey: documentIngestionKeys.documents() });
      queryClient.invalidateQueries({ queryKey: ["v2", "invoices"] });
    },
  });
}
