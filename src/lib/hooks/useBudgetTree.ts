import { useQuery } from '@tanstack/react-query';
import { getBudgetTree } from '../api/budgets';

/**
 * Fetch the nested budget node tree.
 * Pass versionId to scope the tree to a specific budget version.
 * Returns the tree only when versionId is provided.
 */
export function useBudgetTree(versionId: string | undefined) {
  return useQuery({
    queryKey: ['budgetTree', versionId],
    queryFn: () => getBudgetTree({ version: versionId }),
    enabled: !!versionId,
  });
}
