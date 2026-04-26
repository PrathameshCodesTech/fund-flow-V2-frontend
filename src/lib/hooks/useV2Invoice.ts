import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listInvoices,
  getInvoice,
  createInvoice,
  submitInvoice,
  updateInvoice,
  listSubmissions,
  getSubmission,
  createSubmission,
  extractSubmission,
  updateSubmissionFields,
  submitSubmission,
  listVendorSendToOptions,
  cancelSubmission,
  addSubmissionDocument,
  listEligibleWorkflows,
  attachWorkflow,
  getPendingReviewInvoices,
  beginInvoiceReview,
  getInvoicePayment,
  recordInvoicePayment,
} from "../api/v2invoice";
import type {
  CreateInvoiceRequest,
  SubmissionCreateRequest,
  SubmissionUpdateRequest,
  InvoiceDocumentCreateRequest,
  SubmissionSubmitRequest,
} from "../types/v2invoice";

// ── Invoice List ─────────────────────────────────────────────────────────────

export function useInvoices(params?: { scope_node?: string; status?: string }) {
  return useQuery({
    queryKey: ["v2", "invoices", params],
    queryFn: async () => {
      const res = await listInvoices(params);
      return Array.isArray(res) ? res : (res?.results ?? []);
    },
  });
}

// ── Invoice Detail ───────────────────────────────────────────────────────────

export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: ["v2", "invoice", id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  });
}

// ── Create Invoice ───────────────────────────────────────────────────────────

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvoiceRequest) => createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "invoices"] });
    },
  });
}

export function useSubmitInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitInvoice(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "invoice", id] });
    },
  });
}

// ── Update Invoice ───────────────────────────────────────────────────────────

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateInvoiceRequest>;
    }) => updateInvoice(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "invoice", id] });
    },
  });
}

// ── Vendor Invoice Submissions ────────────────────────────────────────────────

export function useSubmissions(params?: { status?: string }) {
  return useQuery({
    queryKey: ["v2", "submissions", params],
    queryFn: () => listSubmissions(params),
  });
}

export function useSubmission(id: string | null) {
  return useQuery({
    queryKey: ["v2", "submission", id],
    queryFn: () => getSubmission(id!),
    enabled: !!id,
  });
}

export function useCreateSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmissionCreateRequest) => createSubmission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "submissions"] });
    },
  });
}

export function useExtractSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => extractSubmission(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "submission", id] });
    },
  });
}

export function useUpdateSubmissionFields() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubmissionUpdateRequest }) =>
      updateSubmissionFields(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "submission", id] });
    },
  });
}

export function useSubmitSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubmissionSubmitRequest }) => submitSubmission(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "submission", id] });
    },
  });
}

export function useVendorSendToOptions() {
  return useQuery({
    queryKey: ["v2", "vendor-send-to-options"],
    queryFn: () => listVendorSendToOptions(),
  });
}

export function useCancelSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelSubmission(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "submission", id] });
    },
  });
}

export function useAddSubmissionDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceDocumentCreateRequest }) =>
      addSubmissionDocument(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "submission", id] });
    },
  });
}

// ── Invoice Workflow Attachment ────────────────────────────────────────────────

export function useEligibleWorkflows(invoiceId: string | null) {
  return useQuery({
    queryKey: ["v2", "invoice", invoiceId, "eligible-workflows"],
    queryFn: () => listEligibleWorkflows(invoiceId!),
    enabled: !!invoiceId,
  });
}

export function useAttachWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: { template_version_id: number; activate?: boolean } }) =>
      attachWorkflow(invoiceId, data),
    onSuccess: (_data, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "invoice", invoiceId] });
    },
  });
}

// ── Pending Review Queue ─────────────────────────────────────────────────────────

export function usePendingReviewInvoices() {
  return useQuery({
    queryKey: ["v2", "pending-review"],
    queryFn: () => getPendingReviewInvoices(),
  });
}

export function useBeginInvoiceReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      templateVersionId,
    }: {
      invoiceId: number;
      templateVersionId: number;
    }) => beginInvoiceReview(invoiceId, templateVersionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "pending-review"] });
    },
  });
}

// ── Invoice Payment ─────────────────────────────────────────────────────────────

export function useInvoicePayment(invoiceId: string | null) {
  return useQuery({
    queryKey: ["v2", "invoice", invoiceId, "payment"],
    queryFn: () => getInvoicePayment(invoiceId!),
    enabled: !!invoiceId,
  });
}

export function useRecordInvoicePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      data,
    }: {
      invoiceId: string;
      data: Record<string, unknown>;
    }) => recordInvoicePayment(invoiceId, data),
    onSuccess: (_data, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["v2", "invoice", invoiceId, "payment"] });
    },
  });
}
