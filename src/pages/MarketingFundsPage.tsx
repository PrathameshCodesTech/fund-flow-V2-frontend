import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { ExportDialog } from "@/components/ExportDialog";
import {
  ChevronRight,
  AlertTriangle,
  Download,
  AlertCircle,
} from "lucide-react";
import { useBudgetPeriods, useBudgetVersions, useBudgetVersionSummary } from "@/lib/hooks/useBudgets";
import { useBudgetTree } from "@/lib/hooks/useBudgetTree";
import { ApiError } from "@/lib/api/client";
import type { BudgetNode, BudgetVersionSummary } from "@/lib/types/budgets";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseAmount(v: string | null | undefined): number {
  if (!v) return 0;
  return parseFloat(v) || 0;
}

function formatAmount(amount: number, currency: string): string {
  if (amount === 0) return "—";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  // Format based on currency — INR uses lakhs/crores, others use raw
  if (currency === "INR") {
    if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
    return `${sign}₹${abs.toLocaleString("en-IN")}`;
  }
  return `${sign}${currency} ${abs.toLocaleString()}`;
}

/** Mapper — converts a BudgetNode from the backend tree into a display item. */
interface DisplayItem {
  id: string;
  code: string;
  name: string;
  description: string;
  approvedAmount: number;
  currency: string;
  depth: number;
  children: DisplayItem[];
}

function mapNode(node: BudgetNode): DisplayItem {
  return {
    id: node.id,
    code: node.code,
    name: node.name,
    description: node.description,
    approvedAmount: parseAmount(node.approved_amount),
    currency: node.currency,
    depth: node.depth,
    children: (node.children ?? []).map(mapNode),
  };
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: BudgetVersionSummary }) {
  const total = parseAmount(summary.total_approved_amount);
  const isMixed = summary.total_approved_amount === null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="widget-card"
      >
        <p className="text-caption">Total Approved</p>
        {isMixed ? (
          <p className="text-sm font-semibold text-foreground mt-1">Mixed currencies</p>
        ) : (
          <p className="text-financial mt-1">
            {formatAmount(total, summary.summary_currency ?? "INR")}
          </p>
        )}
        <p className="text-caption mt-1">{summary.summary_currency ?? "Multi-currency"}</p>
      </motion.div>

      {isMixed && summary.currency_distribution.map((cd) => (
        <motion.div
          key={cd.currency}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="widget-card"
        >
          <p className="text-caption">{cd.currency} Total</p>
          <p className="text-financial mt-1">
            {formatAmount(parseAmount(cd.total_approved_amount), cd.currency)}
          </p>
          <p className="text-caption mt-1">Approved</p>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="widget-card"
      >
        <p className="text-caption">Budget Nodes</p>
        <p className="text-financial mt-1">{summary.node_count}</p>
        <p className="text-caption mt-1">{summary.leaf_node_count} leaf nodes</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="widget-card"
      >
        <p className="text-caption">Period</p>
        <p className="text-sm font-semibold text-foreground mt-1 truncate">{summary.period.name}</p>
        <p className="text-caption mt-1">FY{summary.period.fiscal_year}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="widget-card"
      >
        <p className="text-caption">Version</p>
        <p className="text-sm font-semibold text-foreground mt-1 truncate">{summary.version.name}</p>
        <p className="text-caption mt-1">v{summary.version.version_number}</p>
      </motion.div>
    </div>
  );
}

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="widget-card animate-pulse">
          <div className="h-3 bg-muted rounded w-1/2 mb-2" />
          <div className="h-6 bg-muted rounded w-3/4 mb-1" />
          <div className="h-3 bg-muted rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

// ── Budget tree table ─────────────────────────────────────────────────────────

function BudgetRow({ item, depth = 0 }: { item: DisplayItem; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children.length > 0;

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`group transition-colors cursor-pointer ${
          hasChildren ? "hover:bg-primary/3 font-semibold" : "hover:bg-secondary/50"
        }`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <td className="py-3 px-4" style={{ paddingLeft: `${16 + depth * 24}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </motion.div>
            ) : (
              <div className="w-4 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <span className={`text-sm ${hasChildren ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                {item.code && (
                  <span className="text-muted-foreground mr-2 font-mono text-xs">{item.code}</span>
                )}
                {item.name}
              </span>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="py-3 px-4 text-right">
          <span className="text-sm tabular-nums font-medium text-foreground">
            {formatAmount(item.approvedAmount, item.currency)}
          </span>
        </td>
        <td className="py-3 px-4 text-right">
          <span className="text-xs font-mono text-muted-foreground">{item.currency}</span>
        </td>
      </motion.tr>
      <AnimatePresence>
        {expanded && hasChildren && item.children.map((child) => (
          <BudgetRow key={child.id} item={child} depth={depth + 1} />
        ))}
      </AnimatePresence>
    </>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-border/30">
          <td className="py-3 px-4">
            <div className="h-4 bg-muted rounded" style={{ width: `${60 + (i % 3) * 15}%` }} />
          </td>
          <td className="py-3 px-4 text-right">
            <div className="h-4 bg-muted rounded w-20 ml-auto" />
          </td>
          <td className="py-3 px-4 text-right">
            <div className="h-3 bg-muted rounded w-8 ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MarketingFundsPage() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [exportOpen, setExportOpen] = useState(false);

  const { data: periods, isLoading: periodsLoading, error: periodsError } = useBudgetPeriods();
  const { data: versions, isLoading: versionsLoading } = useBudgetVersions(
    selectedPeriodId ? { period: selectedPeriodId } : undefined,
  );
  const { data: tree, isLoading: treeLoading } = useBudgetTree(selectedVersionId || undefined);
  const { data: summary, isLoading: summaryLoading } = useBudgetVersionSummary(
    selectedVersionId || undefined,
  );

  // Auto-select first active period when periods load
  const periodOptions = periods ?? [];
  const versionOptions = versions ?? [];

  // Auto-select first active period once periods load
  useEffect(() => {
    if (!selectedPeriodId && periodOptions.length > 0) {
      const active = periodOptions.find((p) => p.status === "active") ?? periodOptions[0];
      setSelectedPeriodId(active.id);
    }
  }, [periodOptions, selectedPeriodId]);

  // Auto-select first active version when versions for the selected period load
  useEffect(() => {
    if (selectedPeriodId && !selectedVersionId && versionOptions.length > 0) {
      const active = versionOptions.find((v) => v.is_active) ?? versionOptions[0];
      setSelectedVersionId(active.id);
    }
  }, [versionOptions, selectedPeriodId, selectedVersionId]);

  const displayTree = useMemo(
    () => (tree ?? []).map(mapNode),
    [tree],
  );

  const errorMessage =
    periodsError instanceof ApiError
      ? periodsError.message
      : periodsError
      ? "Failed to load budget periods."
      : null;

  const isTreeLoading = treeLoading || summaryLoading;

  return (
    <>
      <AppLayout title="Marketing Funds" subtitle="Budget hierarchy & approved amounts">

        {/* Period / Version selectors */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Period</label>
            <select
              value={selectedPeriodId}
              onChange={(e) => {
                setSelectedPeriodId(e.target.value);
                setSelectedVersionId("");
              }}
              disabled={periodsLoading}
              className="px-3 py-2 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-w-[160px]"
            >
              <option value="" disabled>
                {periodsLoading ? "Loading…" : "Select period"}
              </option>
              {periodOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (FY{p.fiscal_year})
                </option>
              ))}
            </select>
          </div>

          {selectedPeriodId && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Version</label>
              <select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                disabled={versionsLoading || versionOptions.length === 0}
                className="px-3 py-2 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-w-[180px]"
              >
                <option value="" disabled>
                  {versionsLoading ? "Loading…" : "Select version"}
                </option>
                {versionOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.is_active ? "(active)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="ml-auto">
            <button
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* No period selected */}
        {!periodsLoading && !errorMessage && periodOptions.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No budget periods found. Create a budget period in the backend to get started.
          </div>
        )}

        {/* Summary cards */}
        {isTreeLoading && selectedVersionId && <SummaryCardsSkeleton />}
        {summary && !isTreeLoading && <SummaryCards summary={summary} />}

        {/* No version selected but period is selected */}
        {selectedPeriodId && !selectedVersionId && !versionsLoading && versionOptions.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No budget versions found for this period.
          </div>
        )}

        {/* Budget table */}
        {selectedVersionId && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="widget-card p-0 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-card-title">Budget Hierarchy</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                Approved amounts only — utilization tracked via invoices
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4 pl-6">
                      Category
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground py-3 px-4">
                      Approved Amount
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground py-3 px-4">
                      Currency
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {isTreeLoading ? (
                    <TableSkeleton />
                  ) : displayTree.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-sm text-muted-foreground">
                        No budget nodes found for this version.
                      </td>
                    </tr>
                  ) : (
                    displayTree.map((item) => <BudgetRow key={item.id} item={item} />)
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AppLayout>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Budget Report"
        type="budget"
      />
    </>
  );
}
