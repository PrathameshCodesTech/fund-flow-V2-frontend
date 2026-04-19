import { useNavigate } from "react-router-dom";
import { V2Shell } from "@/components/v2/V2Shell";
import { useInsights } from "@/lib/hooks/useV2Dashboard";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/types/v2invoice";
import { cn } from "@/lib/utils";
import {
  Loader2,
  ArrowLeft,
  BarChart3,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatHours(h: number): string {
  if (h < 1) return "<1h";
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

// ── Status colors ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-stone-100 text-stone-800",
  pending_workflow: "bg-violet-100 text-violet-800",
  pending: "bg-yellow-100 text-yellow-800",
  in_review: "bg-purple-100 text-purple-800",
  internally_approved: "bg-indigo-100 text-indigo-800",
  finance_pending: "bg-blue-100 text-blue-800",
  finance_approved: "bg-green-100 text-green-800",
  finance_rejected: "bg-red-100 text-red-800",
  rejected: "bg-red-100 text-red-800",
  paid: "bg-emerald-100 text-emerald-800",
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const InsightsPage = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useInsights();

  const totalInvoices = data?.invoice_status_distribution?.reduce(
    (sum, item) => sum + item.count, 0
  ) ?? 0;

  const maxVolumeCount = Math.max(
    ...(data?.entity_volume?.map(e => e.count) ?? [1])
  );

  const maxBottleneckHours = Math.max(
    ...(data?.bottleneck_stages?.map(b => {
      const diff = Date.now() - new Date(b.created_at).getTime();
      return diff / 3600000;
    }) ?? [1])
  );

  return (
    <V2Shell
      title="Insights"
      titleIcon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      }
    >
      <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">

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

            {/* ── Invoice Status Distribution ────────────────────────────── */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Invoice Status Distribution</h3>
                <span className="ml-auto text-xs text-muted-foreground">{totalInvoices} total</span>
              </div>
              <div className="p-5">
                {data.invoice_status_distribution?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invoice data.</p>
                ) : (
                  <div className="space-y-2">
                    {data.invoice_status_distribution?.map(({ status, count }) => {
                      const pct = totalInvoices > 0 ? (count / totalInvoices) * 100 : 0;
                      return (
                        <div key={status} className="flex items-center gap-3">
                          <div className="w-40 shrink-0">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              STATUS_COLORS[status] ?? "bg-stone-100 text-stone-800"
                            )}>
                              {INVOICE_STATUS_LABELS[status as InvoiceStatus] ?? status}
                            </span>
                          </div>
                          <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", STATUS_COLORS[status] ?? "bg-stone-400")}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-sm font-semibold tabular-nums shrink-0">
                            {count}
                          </span>
                          <span className="w-12 text-right text-xs text-muted-foreground shrink-0">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

              {/* ── Entity Volume ────────────────────────────────────────── */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Invoice Volume by Entity</h3>
                </div>
                <div className="p-5">
                  {data.entity_volume?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No entity data.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.entity_volume?.map((item) => {
                        const barWidth = maxVolumeCount > 0 ? (item.count / maxVolumeCount) * 100 : 0;
                        return (
                          <div key={item.scope_node__id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium truncate">{item.scope_node__name}</span>
                              <span className="tabular-nums shrink-0 ml-2">
                                {item.count} invoice{item.count !== 1 ? "s" : ""}
                                {item.total_amount && (
                                  <span className="text-muted-foreground ml-2">
                                    · ₹{Number(item.total_amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-400 rounded-full"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Stage Turnaround ────────────────────────────────────── */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Average Turnaround by Stage</h3>
                </div>
                <div className="p-5">
                  {data.stage_turnaround?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No stage turnaround data.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.stage_turnaround?.map((stage) => (
                        <div key={stage.group_name} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium truncate">{stage.group_name}</span>
                            <span className="tabular-nums shrink-0 ml-2 text-muted-foreground">
                              {stage.count} step{stage.count !== 1 ? "s" : ""}
                            </span>
                            <span className="tabular-nums shrink-0 font-semibold">
                              {formatHours(stage.avg_turnaround_hours)}
                            </span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-400 rounded-full"
                              style={{ width: `${Math.min(100, (stage.avg_turnaround_hours / 168) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* ── Bottleneck Stages ─────────────────────────────────────── */}
            {data.bottleneck_stages?.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden">
                <div className="px-5 py-4 border-b border-amber-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-foreground">Active Steps Stuck &gt;24h</h3>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {data.bottleneck_stages.length} stuck step{data.bottleneck_stages.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="p-5">
                  <div className="space-y-2">
                    {data.bottleneck_stages?.map((item) => {
                      const hours = (Date.now() - new Date(item.created_at).getTime()) / 3600000;
                      const pct = maxBottleneckHours > 0 ? (hours / maxBottleneckHours) * 100 : 0;
                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium truncate">{item.workflow_step__name}</span>
                              <span className="text-xs text-muted-foreground">
                                in {item.instance_group__step_group__name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{item.instance_group__instance__subject_scope_node__name}</span>
                              {item.assigned_user__email && (
                                <span>· {item.assigned_user__email}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-20 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-amber-700 tabular-nums w-10 text-right">
                              {formatHours(hours)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Finance Turnaround ───────────────────────────────────── */}
            {data.finance_turnaround?.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Finance Decision Turnaround</h3>
                </div>
                <div className="p-5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b border-border">
                          <th className="pb-2 font-medium">Subject</th>
                          <th className="pb-2 font-medium">Decision</th>
                          <th className="pb-2 font-medium">Turnaround</th>
                          <th className="pb-2 font-medium">Decided At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.finance_turnaround?.slice(0, 20).map((item) => (
                          <tr key={item.handoff_id}>
                            <td className="py-2">
                              <span className="font-medium capitalize">{item.module}</span>
                              <span className="text-muted-foreground ml-1">#{item.subject_id}</span>
                            </td>
                            <td className="py-2">
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                item.decision === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              )}>
                                {item.decision}
                              </span>
                            </td>
                            <td className="py-2 font-semibold tabular-nums">
                              {formatHours(item.turnaround_hours)}
                            </td>
                            <td className="py-2 text-muted-foreground tabular-nums">
                              {new Date(item.acted_at).toLocaleDateString("en-IN", {
                                day: "numeric", month: "short",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </V2Shell>
  );
};

export default InsightsPage;
