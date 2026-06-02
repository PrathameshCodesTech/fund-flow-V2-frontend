import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FinanceShell } from "@/components/v2/FinanceShell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { listFinanceHandoffs, approveFinanceHandoff, rejectFinanceHandoff } from "@/lib/api/v2finance";
import { FINANCE_HANDOFF_STATUS_LABELS, type FinanceHandoffStatus } from "@/lib/types/v2finance";
import { RecordPaymentButton } from "@/components/invoices/RecordPaymentDialog";
import { QuickApproveDialog, QuickRejectDialog } from "@/components/finance/QuickActionDialogs";
import {
  FileText,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
} from "lucide-react";

function fmtDate(val: string | null): string {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(val));
  } catch {
    return val;
  }
}

function StatusBadge({ status }: { status: FinanceHandoffStatus }) {
  const config = {
    pending: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300", icon: Clock },
    sent: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", icon: Clock },
    finance_approved: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
    finance_rejected: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", icon: XCircle },
    cancelled: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-500 dark:text-slate-400", icon: XCircle },
  }[status] ?? { bg: "bg-slate-100", text: "text-slate-700", icon: Clock };

  const Icon = config.icon;
  const label = FINANCE_HANDOFF_STATUS_LABELS[status] ?? status;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
        ${active
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
        }
      `}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count !== undefined && count > 0 && (
        <span className={`
          px-2 py-0.5 rounded-full text-xs font-semibold
          ${active ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}
        `}>
          {count}
        </span>
      )}
    </button>
  );
}

function ReviewItem({
  handoff,
  showAction,
  onClick,
}: {
  handoff: {
    id: number | string;
    subject_name: string;
    vendor_name: string | null;
    module: string;
    scope_node: string | null;
    sent_at: string | null;
    status: FinanceHandoffStatus;
    finance_reference_id?: string | null;
    invoice_id?: number | string | null;
    can_record_payment?: boolean;
  };
  showAction: boolean;
  onClick: () => void;
}) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const isApproved = handoff.status === "finance_approved";

  return (
    <>
      <div
        onClick={onClick}
        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate text-foreground">{handoff.subject_name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{handoff.vendor_name || "-"}</span>
              {handoff.finance_reference_id && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <span className="text-xs text-muted-foreground">Ref: {handoff.finance_reference_id}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <div className="flex flex-col items-start sm:items-end gap-1">
            <StatusBadge status={handoff.status} />
            <span className="text-xs text-muted-foreground">{fmtDate(handoff.sent_at)}</span>
          </div>

          {showAction ? (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1 h-8 px-2.5 border-emerald-500/50 text-emerald-700 hover:bg-emerald-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setApproveOpen(true);
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Approve</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1 h-8 px-2.5 border-destructive/50 text-destructive hover:bg-destructive/5"
                onClick={(e) => {
                  e.stopPropagation();
                  setRejectOpen(true);
                }}
              >
                <XCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reject</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 h-8 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {isApproved && handoff.invoice_id && handoff.can_record_payment && (
                <div onClick={(e) => e.stopPropagation()}>
                  <RecordPaymentButton
                    invoiceId={String(handoff.invoice_id)}
                    additionalInvalidateKeys={[["finance", "handoffs"]]}
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 gap-1"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Payment</span>
                  </RecordPaymentButton>
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 h-8 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <QuickApproveDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        handoffId={handoff.id}
        subjectName={handoff.subject_name}
      />
      <QuickRejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        handoffId={handoff.id}
        subjectName={handoff.subject_name}
      />
    </>
  );
}

function EmptyState({ type }: { type: "pending" | "completed" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={`rounded-full p-6 mb-4 ${type === "pending" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-muted"}`}>
        {type === "pending" ? (
          <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <FileText className="h-10 w-10 text-muted-foreground" />
        )}
      </div>
      <h3 className="font-semibold text-lg text-foreground mb-1">
        {type === "pending" ? "All caught up!" : "No completed reviews yet"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {type === "pending"
          ? "There are no pending invoice reviews at this time. New submissions will appear here."
          : "Completed reviews will appear here once you start reviewing submissions."}
      </p>
    </div>
  );
}

export default function FinanceInvoiceListPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");

  const pendingQuery = useQuery({
    queryKey: ["finance", "handoffs", "sent"],
    queryFn: () => listFinanceHandoffs({ status: "sent" }),
  });

  const completedQuery = useQuery({
    queryKey: ["finance", "handoffs", "completed"],
    queryFn: async () => {
      const [approved, rejected] = await Promise.all([
        listFinanceHandoffs({ status: "finance_approved" }),
        listFinanceHandoffs({ status: "finance_rejected" }),
      ]);
      return {
        results: [...(approved.results ?? []), ...(rejected.results ?? [])].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        ),
      };
    },
    enabled: activeTab === "completed",
  });

  const pendingHandoffs = pendingQuery.data?.results ?? [];
  const completedHandoffs = completedQuery.data?.results ?? [];
  const currentHandoffs = activeTab === "pending" ? pendingHandoffs : completedHandoffs;
  const isLoading = activeTab === "pending" ? pendingQuery.isLoading : completedQuery.isLoading;

  return (
    <FinanceShell
      title="Invoice Reviews"
      breadcrumbs={[
        { label: "Finance", href: "/finance" },
        { label: "Invoice Reviews" },
      ]}
    >
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Invoice Reviews</h1>
              <p className="text-muted-foreground mt-1">
                Review and approve invoice and campaign submissions
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2">
            <TabButton
              active={activeTab === "pending"}
              onClick={() => setActiveTab("pending")}
              icon={Clock}
              label="Pending"
              count={pendingHandoffs.length}
            />
            <TabButton
              active={activeTab === "completed"}
              onClick={() => setActiveTab("completed")}
              icon={CheckCircle2}
              label="Completed"
            />
          </div>

          {/* Content */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/30">
              <h2 className="font-semibold text-foreground">
                {activeTab === "pending" ? "Pending Reviews" : "Completed Reviews"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeTab === "pending"
                  ? `${pendingHandoffs.length} invoice${pendingHandoffs.length !== 1 ? "s" : ""} awaiting your review`
                  : `${completedHandoffs.length} invoice${completedHandoffs.length !== 1 ? "s" : ""} reviewed`}
              </p>
            </div>

            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading reviews...</p>
                  </div>
                </div>
              ) : currentHandoffs.length === 0 ? (
                <EmptyState type={activeTab} />
              ) : (
                <div className="space-y-2">
                  {currentHandoffs.map((handoff) => (
                    <ReviewItem
                      key={handoff.id}
                      handoff={handoff}
                      showAction={activeTab === "pending"}
                      onClick={() => navigate(`/finance/invoices/${handoff.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </FinanceShell>
  );
}
