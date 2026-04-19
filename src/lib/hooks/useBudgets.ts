import { useQuery } from '@tanstack/react-query';
import {
  listBudgetPeriods,
  listBudgetVersions,
  getBudgetVersionSummary,
  listBudgetNodes,
  listBudgetNodeTypes,
} from '../api/budgets';

export function useBudgetPeriods(params?: {
  organization?: string;
  fiscal_year?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: ['budgetPeriods', params],
    queryFn: () => listBudgetPeriods(params),
  });
}

export function useBudgetVersions(params?: {
  organization?: string;
  period?: string;
}) {
  return useQuery({
    queryKey: ['budgetVersions', params],
    queryFn: () => listBudgetVersions(params),
  });
}

export function useBudgetVersionSummary(versionId: string | undefined) {
  return useQuery({
    queryKey: ['budgetVersionSummary', versionId],
    queryFn: () => getBudgetVersionSummary(versionId!),
    enabled: !!versionId,
  });
}

export function useBudgetNodes(params?: {
  organization?: string;
  period?: string;
  version?: string;
  legal_entity?: string;
  org_unit?: string;
} | undefined) {
  return useQuery({
    queryKey: ['budgetNodes', params],
    queryFn: () => listBudgetNodes(params),
  });
}

export function useBudgetNodeTypes() {
  return useQuery({
    queryKey: ['budgetNodeTypes'],
    queryFn: () => listBudgetNodeTypes(),
  });
}
