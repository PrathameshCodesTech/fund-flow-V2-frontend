import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listFinanceHandoffs, getFinanceHandoff, resendFinanceHandoff } from "../api/v2finance";
import type { FinanceHandoffFilters } from "../types/v2finance";

// ── Finance Handoff List ──────────────────────────────────────────────────────

export function useFinanceHandoffs(params?: FinanceHandoffFilters) {
  return useQuery({
    queryKey: ["v2", "finance-handoffs", params],
    queryFn: async () => {
      const res = await listFinanceHandoffs(params);
      return res.results;
    },
  });
}

// ── Finance Handoff Detail ────────────────────────────────────────────────────

export function useFinanceHandoff(id: string | null) {
  return useQuery({
    queryKey: ["v2", "finance-handoff", id],
    queryFn: () => getFinanceHandoff(id!),
    enabled: !!id,
  });
}

// ── Resend Finance Handoff ────────────────────────────────────────────────────

export function useResendFinanceHandoff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resendFinanceHandoff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "finance-handoffs"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "finance-handoff"] });
    },
  });
}
