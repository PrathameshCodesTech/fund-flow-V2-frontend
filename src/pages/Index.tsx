import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Wallet, FileText, CheckCircle2, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import {
  useDashboardSummary,
  usePendingApprovalsSummary,
} from "@/lib/hooks/useDashboard";
import type { CurrencyAmountRow, DashboardSummary } from "@/lib/types/reporting";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function formatCurrency(value: string | number, currency: string): string {
  const amount = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(amount)) {
    return currency;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatOptionalCount(value: number | undefined): string {
  return value === undefined ? "-" : formatCount(value);
}

function formatAmountHeadline(amount: string | null, rows: CurrencyAmountRow[]): string {
  if (rows.length === 0) {
    return "-";
  }
  if (amount !== null && rows.length === 1) {
    return formatCurrency(amount, rows[0].currency);
  }
  return "Multi-currency";
}

function formatAmountDetail(rows: CurrencyAmountRow[]): string {
  if (rows.length === 0) {
    return "No amount in scope";
  }
  return rows.map((row) => `${row.currency} ${formatCurrency(row.total_amount, row.currency)}`).join(" | ");
}

function LoadingCard({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="widget-card animate-pulse"
    >
      <div className="mb-4 h-4 w-28 rounded bg-muted" />
      <div className="mb-2 h-8 w-24 rounded bg-muted" />
      <div className="h-5 w-40 rounded bg-muted" />
    </motion.div>
  );
}

function StatusRow({
  label,
  count,
  total,
  toneClass,
}: {
  label: string;
  count: number;
  total: number;
  toneClass: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-caption">{formatCount(count)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <motion.div
          className={`h-full rounded-full ${toneClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.7 }}
        />
      </div>
    </div>
  );
}

function AmountSummaryCard({
  title,
  amount,
  rows,
  delay = 0,
}: {
  title: string;
  amount: string | null;
  rows: CurrencyAmountRow[];
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-border bg-secondary/20 p-4"
    >
      <p className="text-caption">{title}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">
        {formatAmountHeadline(amount, rows)}
      </p>
      <p className="mt-2 text-caption">{formatAmountDetail(rows)}</p>
    </motion.div>
  );
}

function DashboardContent({
  summary,
  pending,
  pendingError,
}: {
  summary: DashboardSummary;
  pending?: { pending_task_count: number; in_progress_task_count: number };
  pendingError?: string;
}) {
  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Vendors"
          value={formatCount(summary.total_vendors)}
          change={`${formatCount(summary.total_campaigns)} campaigns in scope`}
          changeType="neutral"
          icon={<Wallet className="w-5 h-5" />}
          delay={0}
        />
        <MetricCard
          title="Budget Versions"
          value={formatCount(summary.total_budget_versions)}
          change={`${formatCount(summary.total_invoices)} invoices in scope`}
          changeType="neutral"
          icon={<TrendingUp className="w-5 h-5" />}
          delay={0.08}
        />
        <MetricCard
          title="Invoice Review Queue"
          value={formatCount(summary.under_review_invoices)}
          change={`${formatCount(summary.draft_invoices)} drafts awaiting completion`}
          changeType={summary.under_review_invoices > 0 ? "negative" : "neutral"}
          icon={<FileText className="w-5 h-5" />}
          delay={0.16}
        />
        <MetricCard
          title="Pending Approvals"
          value={formatCount(summary.pending_tasks_for_current_user)}
          change={
            pendingError
              ? "In-progress count unavailable"
              : `${formatOptionalCount(pending?.in_progress_task_count)} in progress`
          }
          changeType={summary.pending_tasks_for_current_user > 0 ? "negative" : "neutral"}
          icon={<CheckCircle2 className="w-5 h-5" />}
          delay={0.24}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="widget-card lg:col-span-2"
        >
          <div className="mb-5 flex items-center justify-between">
            <span className="text-card-title">Invoice Amount Summary</span>
            <span className="text-caption">Grouped honestly by currency</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <AmountSummaryCard
              title="Submitted"
              amount={summary.submitted_invoice_amount}
              rows={summary.submitted_invoice_amounts_by_currency}
              delay={0.35}
            />
            <AmountSummaryCard
              title="Under Review"
              amount={summary.under_review_invoice_amount}
              rows={summary.under_review_invoice_amounts_by_currency}
              delay={0.4}
            />
            <AmountSummaryCard
              title="Approved"
              amount={summary.approved_invoice_amount}
              rows={summary.approved_invoice_amounts_by_currency}
              delay={0.45}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="widget-card"
        >
          <div className="mb-5 flex items-center justify-between">
            <span className="text-card-title">Approval Workload</span>
            <span className="text-caption">Current user</span>
          </div>
          {pendingError && (
            <div className="mb-4 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs text-warning">
              {pendingError}
            </div>
          )}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <p className="text-caption">Pending Tasks</p>
              <p className="mt-2 text-financial">{formatOptionalCount(pending?.pending_task_count)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <p className="text-caption">In Progress</p>
              <p className="mt-2 text-financial">{formatOptionalCount(pending?.in_progress_task_count)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <p className="text-caption">Approved Invoices</p>
              <p className="mt-2 text-financial">{formatCount(summary.approved_invoices)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="widget-card"
        >
          <div className="mb-5 flex items-center justify-between">
            <span className="text-card-title">Invoice Status Breakdown</span>
            <span className="text-caption">{formatCount(summary.total_invoices)} total</span>
          </div>
          <div className="space-y-4">
            <StatusRow label="Draft" count={summary.draft_invoices} total={summary.total_invoices} toneClass="bg-muted-foreground" />
            <StatusRow label="Under Review" count={summary.under_review_invoices} total={summary.total_invoices} toneClass="bg-warning" />
            <StatusRow label="Approved" count={summary.approved_invoices} total={summary.total_invoices} toneClass="bg-success" />
            <StatusRow label="Rejected" count={summary.rejected_invoices} total={summary.total_invoices} toneClass="bg-destructive" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="widget-card"
        >
          <div className="mb-5 flex items-center justify-between">
            <span className="text-card-title">Counts In Scope</span>
            <span className="text-caption">Dashboard summary</span>
          </div>
          <div className="space-y-3">
            {[
              ["Vendors", summary.total_vendors],
              ["Campaigns", summary.total_campaigns],
              ["Budget Versions", summary.total_budget_versions],
              ["Invoices", summary.total_invoices],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-secondary/30 px-4 py-3">
                <span className="text-sm text-foreground">{label}</span>
                <span className="text-sm font-semibold text-foreground">{formatCount(Number(value))}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="widget-card"
        >
          <div className="mb-5 flex items-center justify-between">
            <span className="text-card-title">Currency Breakdown</span>
            <span className="text-caption">Submitted + review + approved</span>
          </div>
          <div className="space-y-4">
            {[
              { label: "Submitted", rows: summary.submitted_invoice_amounts_by_currency },
              { label: "Under Review", rows: summary.under_review_invoice_amounts_by_currency },
              { label: "Approved", rows: summary.approved_invoice_amounts_by_currency },
            ].map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                {group.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No amount in scope.</p>
                ) : (
                  <div className="space-y-2">
                    {group.rows.map((row) => (
                      <div key={`${group.label}-${row.currency}`} className="flex items-center justify-between rounded-xl bg-secondary/30 px-4 py-3">
                        <span className="text-sm text-foreground">{row.currency}</span>
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(row.total_amount, row.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}

const Index = () => {
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useDashboardSummary();
  const {
    data: pending,
    isLoading: pendingLoading,
    error: pendingError,
  } = usePendingApprovalsSummary();

  const summaryErrorMessage = summaryError
    ? getErrorMessage(summaryError, "Failed to load dashboard data.")
    : null;
  const pendingErrorMessage = pendingError
    ? getErrorMessage(pendingError, "Approval workload data is unavailable.")
    : null;

  return (
    <AppLayout title="Dashboard" subtitle="Marketing Fund Overview">
      {summaryErrorMessage && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {summaryErrorMessage}
        </div>
      )}

      {summaryLoading && !summary ? (
        <>
          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <LoadingCard delay={0} />
            <LoadingCard delay={0.08} />
            <LoadingCard delay={0.16} />
            <LoadingCard delay={0.24} />
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="widget-card lg:col-span-2 flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading dashboard summary...
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="widget-card flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading approvals...
            </motion.div>
          </div>
        </>
      ) : summary ? (
        <DashboardContent
          summary={summary}
          pending={pendingLoading || pendingError ? undefined : pending}
          pendingError={pendingErrorMessage}
        />
      ) : (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No dashboard data is available for your current scope.
        </div>
      )}
    </AppLayout>
  );
};

export default Index;
