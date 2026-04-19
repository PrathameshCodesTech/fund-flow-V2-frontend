import { apiClient } from './client';
import type {
  BudgetVsSpendFilters,
  BudgetVsSpendRow,
  CampaignSpendRow,
  DashboardSummary,
  InvoiceStatusSummaryRow,
  PendingApprovalsSummary,
  ReportingFilters,
  VendorSpendRow,
} from '../types/reporting';

function serializeFilters<T extends { status?: string | string[] }>(params?: T) {
  if (!params) {
    return undefined;
  }

  return {
    ...params,
    status: Array.isArray(params.status) ? params.status.join(',') : params.status,
  };
}

export function getDashboardSummary(params?: ReportingFilters): Promise<DashboardSummary> {
  return apiClient.get<DashboardSummary>('/api/v1/dashboard/summary/', serializeFilters(params));
}

export function getPendingApprovalsSummary(params?: Pick<ReportingFilters, 'organization'>) {
  return apiClient.get<PendingApprovalsSummary>('/api/v1/insights/pending-approvals/', params);
}

export function getBudgetVsSpend(params?: BudgetVsSpendFilters): Promise<BudgetVsSpendRow[]> {
  return apiClient.get<BudgetVsSpendRow[]>(
    '/api/v1/insights/budget-vs-spend/',
    serializeFilters(params),
  );
}

export function getVendorSpendBreakdown(params?: ReportingFilters): Promise<VendorSpendRow[]> {
  return apiClient.get<VendorSpendRow[]>(
    '/api/v1/insights/vendor-spend/',
    serializeFilters(params),
  );
}

export function getCampaignSpendBreakdown(params?: ReportingFilters): Promise<CampaignSpendRow[]> {
  return apiClient.get<CampaignSpendRow[]>(
    '/api/v1/insights/campaign-spend/',
    serializeFilters(params),
  );
}

export function getInvoiceStatusSummary(params?: ReportingFilters): Promise<InvoiceStatusSummaryRow[]> {
  return apiClient.get<InvoiceStatusSummaryRow[]>(
    '/api/v1/insights/invoice-status-summary/',
    serializeFilters(params),
  );
}
