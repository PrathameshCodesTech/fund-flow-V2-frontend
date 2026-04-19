import { useQuery } from '@tanstack/react-query';
import {
  getBudgetVsSpend,
  getCampaignSpendBreakdown,
  getDashboardSummary,
  getInvoiceStatusSummary,
  getPendingApprovalsSummary,
  getVendorSpendBreakdown,
} from '../api/reporting';
import type { BudgetVsSpendFilters, ReportingFilters } from '../types/reporting';

export function useDashboardSummary(params?: ReportingFilters) {
  return useQuery({
    queryKey: ['dashboardSummary', params],
    queryFn: () => getDashboardSummary(params),
  });
}

export function usePendingApprovalsSummary(params?: Pick<ReportingFilters, 'organization'>) {
  return useQuery({
    queryKey: ['pendingApprovalsSummary', params],
    queryFn: () => getPendingApprovalsSummary(params),
  });
}

export function useBudgetVsSpend(params?: BudgetVsSpendFilters) {
  return useQuery({
    queryKey: ['budgetVsSpend', params],
    queryFn: () => getBudgetVsSpend(params),
  });
}

export function useVendorSpend(params?: ReportingFilters) {
  return useQuery({
    queryKey: ['vendorSpend', params],
    queryFn: () => getVendorSpendBreakdown(params),
  });
}

export function useCampaignSpend(params?: ReportingFilters) {
  return useQuery({
    queryKey: ['campaignSpend', params],
    queryFn: () => getCampaignSpendBreakdown(params),
  });
}

export function useInvoiceStatusSummary(params?: ReportingFilters) {
  return useQuery({
    queryKey: ['invoiceStatusSummary', params],
    queryFn: () => getInvoiceStatusSummary(params),
  });
}

export function useDashboard(params?: ReportingFilters) {
  return useDashboardSummary(params);
}
