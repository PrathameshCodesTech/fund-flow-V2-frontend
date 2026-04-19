import { apiClient } from './client';
import type {
  PaymentRecord,
  PaymentRecordDetail,
  PaymentCreatePayload,
  PaymentUpdatePayload,
} from '../types/finance';
import type { InvoiceListItem } from '../types/invoices';

// ── Payable invoices ──────────────────────────────────────────────────────────

/**
 * GET /api/v1/finance/invoices/payable/
 * Returns approved invoices awaiting payment, scoped to user's org.
 */
export function listPayableInvoices(): Promise<InvoiceListItem[]> {
  return apiClient.get<InvoiceListItem[]>('/api/v1/finance/invoices/payable/');
}

// ── Payment records ───────────────────────────────────────────────────────────

export interface PaymentListParams {
  invoice?: string;
  status?: string;
  currency?: string;
}

/**
 * GET /api/v1/finance/payments/
 * List all payment records (org-scoped). Gated by reporting.view_finance.
 */
export function listPayments(params?: PaymentListParams): Promise<PaymentRecord[]> {
  return apiClient.get<PaymentRecord[]>('/api/v1/finance/payments/', params);
}

/**
 * GET /api/v1/finance/payments/<id>/
 * Retrieve a single payment record with full invoice detail.
 */
export function getPayment(id: string): Promise<PaymentRecordDetail> {
  return apiClient.get<PaymentRecordDetail>(`/api/v1/finance/payments/${id}/`);
}

/**
 * POST /api/v1/finance/payments/
 * Create a payment record. Invoice must be approved.
 * Moves invoice to pending_payment. Gated by invoice.manage.
 */
export function createPayment(data: PaymentCreatePayload): Promise<PaymentRecordDetail> {
  return apiClient.post<PaymentRecordDetail>('/api/v1/finance/payments/', data);
}

/**
 * PATCH /api/v1/finance/payments/<id>/
 * Update a payment record (corrections). Gated by invoice.manage.
 */
export function updatePayment(id: string, data: PaymentUpdatePayload): Promise<PaymentRecordDetail> {
  return apiClient.patch<PaymentRecordDetail>(`/api/v1/finance/payments/${id}/`, data);
}
