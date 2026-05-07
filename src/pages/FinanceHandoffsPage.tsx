import { useState } from "react";
import { V2Shell } from "@/components/v2/V2Shell";
import { useAuth } from "@/contexts/AuthContext";
import { useFinanceHandoffs, useFinanceHandoff, useResendFinanceHandoff } from "@/lib/hooks/useV2Finance";
import {
  FINANCE_HANDOFF_STATUS_LABELS,
  type FinanceHandoffStatus,
  type FinanceHandoffFilters,
} from "@/lib/types/v2finance";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Landmark,
  ChevronLeft,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  AlertCircle,
} from "lucide-react";

// ── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<FinanceHandoffStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  finance_approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  finance_rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancelled: "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200",
};

function HandoffStatusBadge({ status }: { status: FinanceHandoffStatus }) {
  return (
    <Badge className={STATUS_COLORS[status] ?? ""} variant="outline">
      {FINANCE_HANDOFF_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ── Handoff Detail Panel ────────────────────────────────────────────────────

function HandoffDetailPanel({
  handoffId,
  onClose,
  onRefresh,
}: {
  handoffId: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { data: handoff, isLoading } = useFinanceHandoff(handoffId);
  const resendHandoff = useResendFinanceHandoff();
  const [resendError, setResendError] = useState<string | null>(null);
  const { user } = useAuth();
  const canResend = (user?.roles ?? []).some((r) =>
    ["tenant_admin", "org_admin", "finance_team"].includes(r),
  );

  const handleResend = async () => {
    setResendError(null);
    try {
      await resendHandoff.mutateAsync(handoffId);
      toast.success("Finance handoff email resent successfully.");
      onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to resend handoff email.";
      setResendError(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!handoff) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        Handoff not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {handoff.module.charAt(0).toUpperCase() + handoff.module.slice(1)} Finance Handoff
            </h2>
            <p className="text-xs text-muted-foreground">
              {handoff.subject_name}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-2">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <HandoffStatusBadge status={handoff.status} />
        <span className="text-xs text-muted-foreground">
          {FINANCE_HANDOFF_STATUS_LABELS[handoff.status]}
        </span>
      </div>

      {/* Details grid */}
      <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Module</span>
          <span className="font-medium capitalize">{handoff.module}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subject</span>
          <span className="font-medium">{handoff.subject_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Record</span>
          <span className="font-medium">{handoff.subject_type} #{handoff.subject_id}</span>
        </div>
        {handoff.finance_reference_id && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Finance Reference</span>
            <span className="font-mono font-medium">{handoff.finance_reference_id}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Created</span>
          <span className="font-medium">
            {new Date(handoff.created_at).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </span>
        </div>
        {handoff.sent_at && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sent</span>
            <span className="font-medium">
              {new Date(handoff.sent_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Recipients</span>
          <span className="font-medium">{handoff.recipient_count}</span>
        </div>
        {handoff.recipient_emails.length > 0 && (
          <div className="space-y-1 pt-1">
            <span className="text-muted-foreground">Resolved Recipients</span>
            <div className="rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground">
              {handoff.recipient_emails.join(", ")}
            </div>
          </div>
        )}
        {handoff.recipient_emails.length === 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Resolved Recipients</span>
            <span className="font-medium text-destructive">None resolved</span>
          </div>
        )}
      </div>

      {/* Resend action — finance_team / admin only, pending/sent status only */}
      {canResend && (handoff.status === "pending" || handoff.status === "sent") && (
        <div className="space-y-2">
          <Button
            size="sm"
            className="w-full gap-1.5"
            onClick={handleResend}
            disabled={resendHandoff.isPending}
          >
            {resendHandoff.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Resend Email
          </Button>
          {resendError && (
            <div className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{resendError}</span>
            </div>
          )}
        </div>
      )}

      {/* Resend note for decided handoffs */}
      {(handoff.status === "finance_approved" || handoff.status === "finance_rejected") && (
        <div className="flex items-start gap-1.5 rounded-md border border-border bg-secondary/10 px-3 py-2 text-xs text-muted-foreground">
          {handoff.status === "finance_approved" ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600 mt-0.5" />
          ) : (
            <XCircle className="h-3.5 w-3.5 shrink-0 text-red-600 mt-0.5" />
          )}
          <span>This handoff has been {handoff.status === "finance_approved" ? "approved" : "rejected"} via the finance review link.</span>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const FinanceHandoffsPage = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [selectedHandoffId, setSelectedHandoffId] = useState<string | null>(null);

  const filters: FinanceHandoffFilters = {};
  if (statusFilter !== "all") filters.status = statusFilter;
  if (moduleFilter !== "all") filters.module = moduleFilter;

  const { data: handoffs = [], isLoading, refetch } = useFinanceHandoffs(
    Object.keys(filters).length ? filters : undefined,
  );

  return (
    <V2Shell
      title="Finance Handoffs"
      titleIcon={<Landmark className="h-5 w-5 text-muted-foreground" />}
      actions={
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Module</Label>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="campaign">Campaign</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
            </SelectContent>
          </Select>

          <Label className="text-xs text-muted-foreground ml-2">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {Object.entries(FINANCE_HANDOFF_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : handoffs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Landmark className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p>No finance handoffs found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {handoffs.map((handoff) => (
              <div
                key={handoff.id}
                className="group relative rounded-xl border border-border bg-card hover:bg-accent/30 hover:border-primary/30 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                onClick={() => setSelectedHandoffId(handoff.id)}
              >
                {/* Status indicator bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  handoff.status === 'finance_approved' ? 'bg-green-500' :
                  handoff.status === 'finance_rejected' ? 'bg-red-500' :
                  handoff.status === 'sent' ? 'bg-blue-500' :
                  handoff.status === 'pending' ? 'bg-yellow-500' :
                  'bg-gray-400'
                }`} />

                <div className="p-4 pt-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded">
                      {handoff.module}
                    </span>
                    <HandoffStatusBadge status={handoff.status} />
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                    {handoff.subject_name}
                  </h3>

                  {/* Reference ID */}
                  {handoff.finance_reference_id && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 rounded-md mb-3">
                      <span className="text-[10px] text-muted-foreground">REF:</span>
                      <span className="text-[11px] font-mono font-medium text-foreground">{handoff.finance_reference_id}</span>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="space-y-1.5 text-[11px] text-muted-foreground">
                    {handoff.sent_at ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                        <span>Sent {new Date(handoff.sent_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short"
                        })}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-yellow-600 shrink-0" />
                        <span>Awaiting send</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-muted-foreground/70">
                      <div className="w-3 h-3 shrink-0" />
                      <span>Created {new Date(handoff.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}</span>
                    </div>
                  </div>
                </div>

                {/* Hover indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/0 group-hover:bg-primary/50 transition-all" />
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Detail panel as dialog */}
      <Dialog open={!!selectedHandoffId} onOpenChange={(v) => { if (!v) setSelectedHandoffId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Handoff Details</DialogTitle>
          </DialogHeader>
          {selectedHandoffId && (
            <HandoffDetailPanel
              handoffId={selectedHandoffId}
              onClose={() => setSelectedHandoffId(null)}
              onRefresh={() => { refetch(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </V2Shell>
  );
};

export default FinanceHandoffsPage;
