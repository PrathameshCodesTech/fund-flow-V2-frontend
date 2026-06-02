import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FinanceShell } from "@/components/v2/FinanceShell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { listFinanceHandoffs } from "@/lib/api/v2finance";
import { listSubmissions } from "@/lib/api/v2vendor";
import {
  FileText,
  Users,
  Loader2,
  ArrowRight,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Building2,
} from "lucide-react";

function fmtDate(val: string | null): string {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(val));
  } catch {
    return val;
  }
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "primary",
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  color?: "primary" | "success" | "warning" | "danger";
}) {
  const colorClasses = {
    primary: "from-primary/10 to-primary/5 border-primary/20",
    success: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    warning: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    danger: "from-red-500/10 to-red-500/5 border-red-500/20",
  };

  const iconColorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-red-500/10 text-red-600",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${colorClasses[color]} p-4 transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
              {subtitle}
            </p>
          )}
        </div>
        <div className={`rounded-lg p-2 ${iconColorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function ReviewCard({
  title,
  icon: Icon,
  count,
  items,
  emptyMessage,
  isLoading,
  onViewAll,
  onReview,
  type,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  items: Array<{
    id: number | string;
    primary: string;
    secondary: string;
    date: string;
    status?: string;
  }>;
  emptyMessage: string;
  isLoading: boolean;
  onViewAll: () => void;
  onReview: (id: number | string) => void;
  type: "invoice" | "vendor";
}) {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2.5 ${type === "invoice" ? "bg-primary/10 text-primary" : "bg-violet-500/10 text-violet-600"}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">
              {count > 0 ? `${count} pending review${count > 1 ? "s" : ""}` : "All caught up"}
            </p>
          </div>
        </div>
        {count > 0 && (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {count} Pending
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted/50 p-4 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No pending reviews</p>
            <p className="text-xs text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                onClick={() => onReview(item.id)}
                className="group flex items-center justify-between p-4 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    {type === "invoice" ? (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{item.primary}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.secondary}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <Clock className="h-3 w-3" />
                      Pending
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">{item.date}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Review
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="px-6 py-3 border-t bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
          >
            View all {count} reviews
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function FinanceDashboardPage() {
  const navigate = useNavigate();

  // Fetch pending invoice/campaign handoffs
  const invoiceHandoffsQuery = useQuery({
    queryKey: ["finance", "handoffs", "sent"],
    queryFn: () => listFinanceHandoffs({ status: "sent" }),
  });

  // Fetch vendor submissions sent to finance
  const vendorSubmissionsQuery = useQuery({
    queryKey: ["finance", "vendor-submissions", "sent_to_finance"],
    queryFn: () => listSubmissions({ status: "sent_to_finance" }),
  });

  const invoiceHandoffs = invoiceHandoffsQuery.data?.results ?? [];
  const vendorSubmissions = vendorSubmissionsQuery.data?.results ?? [];

  const totalPending = invoiceHandoffs.length + vendorSubmissions.length;

  return (
    <FinanceShell title="Finance Dashboard">
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Welcome Section */}
          <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Welcome to Finance Portal</h1>
                <p className="text-muted-foreground mt-1">
                  Review and manage vendor onboarding and invoice submissions
                </p>
              </div>
              {totalPending > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {totalPending} item{totalPending > 1 ? "s" : ""} pending review
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              title="Total Pending"
              value={totalPending}
              subtitle="Requires your attention"
              icon={Clock}
              color={totalPending > 0 ? "warning" : "success"}
            />
            <StatCard
              title="Invoice Reviews"
              value={invoiceHandoffs.length}
              subtitle="Invoices & campaigns"
              icon={FileText}
              color="primary"
            />
            <StatCard
              title="Vendor Reviews"
              value={vendorSubmissions.length}
              subtitle="New vendor registrations"
              icon={Users}
              color="primary"
            />
          </div>

          {/* Review Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReviewCard
              title="Invoice / Campaign Reviews"
              icon={FileText}
              count={invoiceHandoffs.length}
              items={invoiceHandoffs.map((h) => ({
                id: h.id,
                primary: h.subject_name,
                secondary: `${h.module} • Entity ${h.scope_node ?? "—"}`,
                date: fmtDate(h.sent_at),
              }))}
              emptyMessage="All invoices have been reviewed"
              isLoading={invoiceHandoffsQuery.isLoading}
              onViewAll={() => navigate("/finance/invoices")}
              onReview={(id) => navigate(`/finance/invoices/${id}`)}
              type="invoice"
            />

            <ReviewCard
              title="Vendor Onboarding Reviews"
              icon={Users}
              count={vendorSubmissions.length}
              items={vendorSubmissions.map((s) => ({
                id: s.id,
                primary: s.normalized_vendor_name ?? "Unknown Vendor",
                secondary: s.normalized_email ?? "—",
                date: fmtDate(s.finance_sent_at),
              }))}
              emptyMessage="All vendor submissions have been reviewed"
              isLoading={vendorSubmissionsQuery.isLoading}
              onViewAll={() => navigate("/finance/vendors")}
              onReview={(id) => navigate(`/finance/vendors/${id}`)}
              type="vendor"
            />
          </div>
        </div>
      </ScrollArea>
    </FinanceShell>
  );
}
