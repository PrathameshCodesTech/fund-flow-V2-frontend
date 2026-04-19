import { useQuery } from "@tanstack/react-query";
import { getOpsDashboard, getInvoiceControlTower, getInsights } from "../api/v2dashboard";

// ── Ops Dashboard ─────────────────────────────────────────────────────────────

export function useOpsDashboard() {
  return useQuery({
    queryKey: ["v2", "ops-dashboard"],
    queryFn: getOpsDashboard,
    refetchInterval: 30_000, // Refresh every 30s for operational awareness
  });
}

// ── Invoice Control Tower ─────────────────────────────────────────────────────

export function useInvoiceControlTower(invoiceId: string | null) {
  return useQuery({
    queryKey: ["v2", "invoice-control-tower", invoiceId],
    queryFn: () => getInvoiceControlTower(invoiceId!),
    enabled: !!invoiceId,
    refetchInterval: 15_000, // Refresh more frequently for active workflows
  });
}

// ── Insights ──────────────────────────────────────────────────────────────────

export function useInsights() {
  return useQuery({
    queryKey: ["v2", "insights"],
    queryFn: getInsights,
    staleTime: 5 * 60_000, // Insights are heavier queries, cache 5 min
  });
}
