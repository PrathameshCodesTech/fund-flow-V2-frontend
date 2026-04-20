import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Area, AreaChart,
} from "recharts";
import { V2Shell } from "@/components/v2/V2Shell";
import { useInsights } from "@/lib/hooks/useV2Dashboard";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/types/v2invoice";
import { cn } from "@/lib/utils";
import {
  Loader2, ArrowLeft, BarChart3, Clock, TrendingUp,
  AlertTriangle, CheckCircle2, XCircle, DollarSign, Users,
  Target, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(amount: string | number | null | undefined, currency = "INR"): string {
  if (amount == null) return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function fmtHours(h: number): string {
  if (h < 1) return "<1h";
  if (h < 24) return `${Math.round(h)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

// ── Status color map ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: "#78716c",
  pending_workflow: "#8b5cf6",
  pending: "#eab308",
  in_review: "#a855f7",
  internally_approved: "#6366f1",
  finance_pending: "#3b82f6",
  finance_approved: "#22c55e",
  finance_rejected: "#ef4444",
  rejected: "#ef4444",
  paid: "#10b981",
  cancelled: "#6b7280",
};

// ── Shared chart props ─────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#06b6d4", "#6366f1", "#ef4444",
];

// ── Recharts Tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, formatter }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (v: number, name: string) => [string, string];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background shadow-sm px-3 py-2 text-xs">
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">
            {p.name}: <strong>{formatter ? formatter(p.value, p.name)[0] : p.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── KPI Strip ─────────────────────────────────────────────────────────────────

function KpiStrip({ data }: { data: any }) {
  const dist = data?.invoice_status_distribution ?? [];
  const finTurnaround = data?.finance_turnaround?.summary;

  const totalValue = dist.reduce((s: number, d: any) => s + parseFloat(d.amount || 0), 0);
  const pendingValue = dist
    .filter((d: any) => d.status === "finance_pending")
    .reduce((s: number, d: any) => s + parseFloat(d.amount || 0), 0);
  const approvedValue = dist
    .filter((d: any) => d.status === "finance_approved")
    .reduce((s: number, d: any) => s + parseFloat(d.amount || 0), 0);
  const rejectedValue = dist
    .filter((d: any) => d.status === "finance_rejected")
    .reduce((s: number, d: any) => s + parseFloat(d.amount || 0), 0);

  const kpis = [
    { label: "Total Invoice Value", value: fmtCurrency(totalValue), icon: DollarSign, color: "text-blue-600" },
    { label: "Finance Pending", value: fmtCurrency(pendingValue), icon: Clock, color: "text-amber-600" },
    { label: "Finance Approved", value: fmtCurrency(approvedValue), icon: CheckCircle2, color: "text-green-600" },
    { label: "Finance Rejected", value: fmtCurrency(rejectedValue), icon: XCircle, color: "text-red-600" },
    { label: "Avg Fin. Turnaround", value: finTurnaround?.completed_count ? fmtHours(finTurnaround.avg_hours) : "—", icon: TrendingUp, color: "text-purple-600" },
    { label: "Total Allocations", value: fmtNum((data?.entity_spend ?? []).reduce((s: number, d: any) => s + d.invoice_count, 0)), icon: Target, color: "text-cyan-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <kpi.icon className={cn("h-4 w-4", kpi.color)} />
            <span className="text-xs text-muted-foreground">{kpi.label}</span>
          </div>
          <p className="text-lg font-bold text-foreground">{kpi.value}</p>
        </Card>
      ))}
    </div>
  );
}

// ── Invoice Status Distribution ────────────────────────────────────────────────

function StatusDistChart({ data }: { data: any[] }) {
  if (!data?.length) return <EmptyState label="No invoice data" />;
  const total = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.map(d => ({
    name: INVOICE_STATUS_LABELS[d.status as InvoiceStatus] ?? d.status,
    count: d.count,
    amount: parseFloat(d.amount || 0),
    color: STATUS_COLORS[d.status] ?? "#6b7280",
    pct: total > 0 ? ((d.count / total) * 100).toFixed(0) : "0",
  }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => String(v)} />
          <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip formatter={(v) => [String(v), "Invoices"]} />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Monthly Invoice Trend ──────────────────────────────────────────────────────

function MonthlyTrendChart({ data }: { data: any[] }) {
  if (!data?.length) return <EmptyState label="No monthly trend data yet" />;
  const chartData = data.map(d => ({
    month: d.month.slice(5) === "01" ? d.month : d.month.slice(5) + "월",
    count: d.count,
    amount: parseFloat(d.amount || 0),
  }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ left: 10, right: 20, top: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="amountGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={fmtNum} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
          <Tooltip content={<ChartTooltip formatter={(v, n) => n === "amount" ? [fmtCurrency(v), "Value"] : [String(v), "Count"]} />} />
          <Area yAxisId="right" type="monotone" dataKey="amount" stroke="#3b82f6" fill="url(#amountGrad)" strokeWidth={2} name="Value" />
          <Area yAxisId="left" type="monotone" dataKey="count" stroke="#8b5cf6" fill="none" strokeWidth={2} strokeDasharray="4 4" name="Count" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Entity Spend Chart ─────────────────────────────────────────────────────────

function EntitySpendChart({ data }: { data: any[] }) {
  if (!data?.length) return <EmptyState label="No entity spend data yet" />;
  const chartData = data.slice(0, 8).map(d => ({
    name: d.entity_name?.length > 18 ? d.entity_name.slice(0, 18) + "…" : d.entity_name,
    amount: parseFloat(d.amount || 0),
    invoice_count: d.invoice_count,
  }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
          <Tooltip content={<ChartTooltip formatter={(v) => [fmtCurrency(v), "Amount"]} />} />
          <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Amount" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Category Spend Chart ───────────────────────────────────────────────────────

function CategorySpendChart({ data }: { data: any[] }) {
  if (!data?.length) return <EmptyState label="No allocation/category data yet" />;
  const chartData = data.slice(0, 8).map((d, i) => ({
    name: d.category_name?.length > 16 ? d.category_name.slice(0, 16) + "…" : d.category_name,
    amount: parseFloat(d.amount || 0),
    count: d.allocation_count,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
          <Tooltip content={<ChartTooltip formatter={(v) => [fmtCurrency(v), "Amount"]} />} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} name="Amount">
            {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Campaign Spend Chart ───────────────────────────────────────────────────────

function CampaignSpendChart({ data }: { data: any[] }) {
  if (!data?.length) return <EmptyState label="No campaign spend data yet" />;
  const chartData = data.slice(0, 8).map((d, i) => ({
    name: d.campaign_name?.length > 16 ? d.campaign_name.slice(0, 16) + "…" : d.campaign_name,
    amount: parseFloat(d.amount || 0),
    count: d.allocation_count,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ left: 10, right: 20, top: 5, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
          <Tooltip content={<ChartTooltip formatter={(v) => [fmtCurrency(v), "Amount"]} />} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} name="Amount">
            {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Budget Utilization ─────────────────────────────────────────────────────────

function BudgetUtilCards({ data }: { data: any[] }) {
  if (!data?.length) return <EmptyState label="No budget data yet" />;
  return (
    <div className="space-y-3">
      {data.slice(0, 6).map((b: any) => {
        const pct = b.utilization_percent ?? 0;
        const color = pct >= 100 ? "bg-red-500" : pct >= 90 ? "bg-amber-500" : "bg-green-500";
        return (
          <div key={b.budget_id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate max-w-[160px]">{b.budget_name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {fmtCurrency(b.consumed_amount)} / {fmtCurrency(b.allocated_amount)}
                </span>
                <span className={cn(
                  "text-xs font-bold tabular-nums",
                  pct >= 100 ? "text-red-600" : pct >= 90 ? "text-amber-600" : "text-green-600"
                )}>
                  {pct}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", color)}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Stage Turnaround ───────────────────────────────────────────────────────────

function StageTurnaroundChart({ data }: { data: any[] }) {
  if (!data?.length) return <EmptyState label="No stage turnaround data yet" />;
  const chartData = data.map((d, i) => ({
    name: d.stage_name?.length > 20 ? d.stage_name.slice(0, 20) + "…" : d.stage_name,
    avg_hours: d.avg_hours,
    count: d.completed_count,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmtHours(v)} />
          <Tooltip content={<ChartTooltip formatter={(v) => [fmtHours(v as number), "Avg Time"]} />} />
          <Bar dataKey="avg_hours" radius={[4, 4, 0, 0]} name="Avg Hours" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Top Vendors ─────────────────────────────────────────────────────────────────

function TopVendorsList({ data }: { data: any[] }) {
  if (!data?.length) return <EmptyState label="No vendor data yet" />;
  const maxAmount = Math.max(...data.map(d => parseFloat(d.amount || 0)), 1);
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((v: any, i: number) => {
        const amount = parseFloat(v.amount || 0);
        const pct = (amount / maxAmount) * 100;
        return (
          <div key={v.vendor_id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                <span className="font-medium truncate">{v.vendor_name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground tabular-nums">{v.invoice_count} inv.</span>
                <span className="font-semibold tabular-nums">{fmtCurrency(amount)}</span>
              </div>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden ml-5">
              <div
                className="h-full bg-blue-400 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Risk Alerts ───────────────────────────────────────────────────────────────

function RiskAlertsSection({ data }: { data: any[] }) {
  if (!data?.length) return null;
  const sevClass = {
    warning: "border-amber-200 bg-amber-50 dark:bg-amber-950/20",
    critical: "border-red-200 bg-red-50 dark:bg-red-950/20",
    info: "border-blue-200 bg-blue-50 dark:bg-blue-950/20",
  };
  const sevIcon = {
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    critical: <AlertCircle className="h-4 w-4 text-red-500" />,
    info: <AlertCircle className="h-4 w-4 text-blue-500" />,
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {data.map((alert: any, i: number) => (
        <div key={i} className={cn(
          "rounded-lg border p-3 flex items-start gap-3",
          sevClass[alert.severity as keyof typeof sevClass] ?? sevClass.info
        )}>
          <div className="shrink-0 mt-0.5">{sevIcon[alert.severity as keyof typeof sevIcon] ?? sevIcon.info}</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{alert.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
            <p className="text-xs font-bold text-foreground mt-1">{alert.metric_value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Finance Turnaround Table ───────────────────────────────────────────────────

function FinanceTurnaroundTable({ data }: { data: any }) {
  const items = data?.items ?? [];
  const summary = data?.summary;
  if (!items.length) return <EmptyState label="No finance decisions yet" />;
  return (
    <div className="space-y-3">
      {summary && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Avg: <strong className="text-foreground">{fmtHours(summary.avg_hours)}</strong></span>
          <span className="text-muted-foreground">Total: <strong className="text-foreground">{summary.completed_count}</strong> decisions</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {["Subject", "Decision", "Turnaround", "Decided"].map(h => (
                <th key={h} className="pb-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.slice(0, 15).map((item: any) => (
              <tr key={item.handoff_id}>
                <td className="py-2">
                  <span className="font-medium capitalize">{item.module}</span>
                  <span className="text-muted-foreground ml-1">#{item.subject_id}</span>
                </td>
                <td className="py-2">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    item.decision === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  )}>
                    {item.decision}
                  </span>
                </td>
                <td className="py-2 font-semibold tabular-nums">{fmtHours(item.turnaround_hours)}</td>
                <td className="py-2 text-muted-foreground tabular-nums text-xs">
                  {new Date(item.acted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Subcategory Table ─────────────────────────────────────────────────────────

function SubcategoryTable({ data }: { data: any[] }) {
  if (!data?.length) return <EmptyState label="No subcategory data yet" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {["Subcategory", "Category", "Allocations", "Amount"].map(h => (
              <th key={h} className="pb-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.slice(0, 15).map((d: any) => (
            <tr key={d.subcategory_id}>
              <td className="py-2 font-medium">{d.subcategory_name}</td>
              <td className="py-2 text-muted-foreground">{d.category_name}</td>
              <td className="py-2 tabular-nums">{d.allocation_count}</td>
              <td className="py-2 font-semibold tabular-nums text-right">{fmtCurrency(d.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

// ── Section Card ────────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children, action }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const InsightsPage = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useInsights();

  return (
    <V2Shell
      title="Insights"
      titleIcon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      }
    >
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">

        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !data && (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            No insights data available.
          </div>
        )}

        {!isLoading && data && (
          <>

            {/* ── KPI Strip ──────────────────────────────────────────────── */}
            <KpiStrip data={data} />

            {/* ── Risk Alerts ──────────────────────────────────────────── */}
            {data.risk_alerts?.length > 0 && (
              <SectionCard
                title="Risk & Alerts"
                icon={<AlertTriangle className="h-4 w-4" />}
              >
                <RiskAlertsSection data={data.risk_alerts} />
              </SectionCard>
            )}

            {/* ── Row 1: Status + Monthly Trend ─────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <SectionCard
                  title="Invoice Status Distribution"
                  icon={<BarChart3 className="h-4 w-4" />}
                  action={
                    <span className="text-xs text-muted-foreground">
                      {data.invoice_status_distribution?.reduce((s: number, d: any) => s + d.count, 0) ?? 0} total
                    </span>
                  }
                >
                  <StatusDistChart data={data.invoice_status_distribution} />
                </SectionCard>
              </div>
              <div className="lg:col-span-2">
                <SectionCard
                  title="Monthly Invoice Value Trend"
                  icon={<TrendingUp className="h-4 w-4" />}
                >
                  <MonthlyTrendChart data={data.monthly_invoice_trend} />
                </SectionCard>
              </div>
            </div>

            {/* ── Row 2: Entity Spend + Category Spend ───────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionCard
                title="Entity-wise Spend"
                icon={<Users className="h-4 w-4" />}
              >
                <EntitySpendChart data={data.entity_spend} />
              </SectionCard>
              <SectionCard
                title="Category-wise Spend"
                icon={<Target className="h-4 w-4" />}
              >
                <CategorySpendChart data={data.category_spend} />
              </SectionCard>
            </div>

            {/* ── Row 3: Subcategory + Campaign ─────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionCard
                title="Subcategory Details"
                icon={<Target className="h-4 w-4" />}
              >
                <SubcategoryTable data={data.subcategory_spend} />
              </SectionCard>
              <SectionCard
                title="Campaign Spend"
                icon={<Target className="h-4 w-4" />}
              >
                <CampaignSpendChart data={data.campaign_spend} />
              </SectionCard>
            </div>

            {/* ── Row 4: Budget Util + Stage Turnaround ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionCard
                title="Budget Utilization"
                icon={<DollarSign className="h-4 w-4" />}
              >
                <BudgetUtilCards data={data.budget_utilization} />
              </SectionCard>
              <SectionCard
                title="Workflow Stage Turnaround"
                icon={<Clock className="h-4 w-4" />}
              >
                <StageTurnaroundChart data={data.stage_turnaround} />
              </SectionCard>
            </div>

            {/* ── Row 5: Top Vendors + Finance Turnaround ────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionCard
                title="Top Vendors"
                icon={<Users className="h-4 w-4" />}
              >
                <TopVendorsList data={data.top_vendors} />
              </SectionCard>
              <SectionCard
                title="Finance Decision Turnaround"
                icon={<CheckCircle2 className="h-4 w-4" />}
              >
                <FinanceTurnaroundTable data={data.finance_turnaround} />
              </SectionCard>
            </div>

          </>
        )}
      </div>
      </ScrollArea>
    </V2Shell>
  );
};

export default InsightsPage;
