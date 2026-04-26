import { apiClient } from './client';
import type {
  InvoiceListItem,
  InvoiceDetail,
  InvoiceAllocationLine,
  InvoiceTaxComponent,
  InvoiceComment,
  InvoiceValidationIssue,
  InvoiceCreatePayload,
} from '../types/invoices';

export interface InvoiceListParams {
  organization?: string;
  legal_entity?: string;
  vendor?: string;
  status?: string;
  invoice_number?: string;
  vendor_invoice_number?: string;
  invoice_date_from?: string;
  invoice_date_to?: string;
  received_date_from?: string;
  received_date_to?: string;
  due_date_from?: string;
  due_date_to?: string;
  is_exception?: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function listInvoices(params?: InvoiceListParams): Promise<InvoiceListItem[]> {
  let page = 1;
  const all: InvoiceListItem[] = [];
  while (true) {
    const res = await apiClient.get<PaginatedResponse<InvoiceListItem>>('/api/v1/invoices/', {
      ...params,
      is_exception:
        params?.is_exception === undefined ? undefined : Number(params.is_exception),
      page,
    });
    all.push(...res.results);
    if (!res.next) break;
    page++;
  }
  return all;
}

export function getInvoice(id: string): Promise<InvoiceDetail> {
  return apiClient.get<InvoiceDetail>(`/api/v1/invoices/${id}/`);
}

export function createInvoice(data: InvoiceCreatePayload): Promise<InvoiceDetail> {
  return apiClient.post<InvoiceDetail>('/api/v1/invoices/', data);
}

export function updateInvoice(
  id: string,
  data: Partial<InvoiceCreatePayload>,
): Promise<InvoiceDetail> {
  return apiClient.patch<InvoiceDetail>(`/api/v1/invoices/${id}/`, data);
}

export function submitInvoice(id: string): Promise<InvoiceDetail> {
  return apiClient.post<InvoiceDetail>(`/api/v1/invoices/${id}/submit/`, {});
}

export function cancelInvoice(id: string, reason?: string): Promise<InvoiceDetail> {
  return apiClient.post<InvoiceDetail>(`/api/v1/invoices/${id}/cancel/`, { reason: reason || '' });
}

// Correct path: /allocations/ (not /allocation-lines/)
export function listAllocations(invoiceId: string): Promise<InvoiceAllocationLine[]> {
  return apiClient.get<InvoiceAllocationLine[]>(`/api/v1/invoices/${invoiceId}/allocations/`);
}

export function replaceAllocations(
  invoiceId: string,
  allocations: Partial<InvoiceAllocationLine>[],
): Promise<InvoiceAllocationLine[]> {
  // Body must be wrapped: { allocations: [...] }
  return apiClient.put<InvoiceAllocationLine[]>(`/api/v1/invoices/${invoiceId}/allocations/`, {
    allocations,
  });
}

export function listTaxComponents(invoiceId: string): Promise<InvoiceTaxComponent[]> {
  return apiClient.get<InvoiceTaxComponent[]>(`/api/v1/invoices/${invoiceId}/tax-components/`);
}

export function replaceTaxComponents(
  invoiceId: string,
  components: Partial<InvoiceTaxComponent>[],
): Promise<InvoiceTaxComponent[]> {
  // Body must be wrapped: { components: [...] }
  return apiClient.put<InvoiceTaxComponent[]>(`/api/v1/invoices/${invoiceId}/tax-components/`, {
    components,
  });
}

export function listComments(invoiceId: string): Promise<InvoiceComment[]> {
  return apiClient.get<InvoiceComment[]>(`/api/v1/invoices/${invoiceId}/comments/`);
}

export function createComment(
  invoiceId: string,
  data: { body: string; is_internal?: boolean; parent?: string },
): Promise<InvoiceComment> {
  return apiClient.post<InvoiceComment>(`/api/v1/invoices/${invoiceId}/comments/`, data);
}

export function listIssues(invoiceId: string): Promise<InvoiceValidationIssue[]> {
  return apiClient.get<InvoiceValidationIssue[]>(`/api/v1/invoices/${invoiceId}/issues/`);
}

export interface AttachWorkflowResult {
  workflow_instance_id: string;
  invoice_status: string;
  template_version_id: string;
  vendor_participant_id: string;
}

export function attachWorkflow(
  invoiceId: string,
  data: { template_version_id: string; vendor_user_id: string; comment?: string },
): Promise<AttachWorkflowResult> {
  return apiClient.post<AttachWorkflowResult>(
    `/api/v1/invoices/${invoiceId}/attach-workflow/`,
    data,
  );
}

// ── Invoice Payment ──────────────────────────────────────────────────────────

import type { InvoicePayment, RecordPaymentRequest } from '../types/invoice-payment';

export async function getInvoicePayment(invoiceId: string): Promise<InvoicePayment | null> {
  try {
    return await apiClient.get<InvoicePayment>(`/api/v1/invoices/${invoiceId}/payment/`);
  } catch {
    // 404 means no payment recorded yet
    return null;
  }
}

export async function recordInvoicePayment(
  invoiceId: string,
  data: RecordPaymentRequest,
): Promise<InvoicePayment> {
  return apiClient.post<InvoicePayment>(
    `/api/v1/invoices/${invoiceId}/record-payment/`,
    data,
  );
}
