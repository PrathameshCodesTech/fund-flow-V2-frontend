import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { V2Shell } from "@/components/v2/V2Shell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2,
  FileText,
  Building2,
  Users,
  Clock,
  GitBranch,
  AlertTriangle,
  X,
  Inbox,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePendingReviewInvoices, useBeginInvoiceReview } from "@/lib/hooks/useV2Invoice";
import type { PendingReviewInvoice, PendingReviewRoute } from "@/lib/api/v2invoice";
import { ApiError } from "@/lib/api/client";

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtAmount(amount: string, currency: string): string {
  const n = parseFloat(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

// ── Loading / Empty / Error states ────────────────────────────────────────

function QueueLoading() {
  return (
    <div className="flex h-48 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function QueueError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-3 text-center px-6">
      <AlertTriangle className="h-5 w-5 text-destructive" />
      <p className="text-sm text-destructive">Failed to load pending review queue.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
    </div>
  );
}

function QueueEmpty() {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-center px-6">
      <Inbox className="h-6 w-6 text-muted-foreground/50" />
      <p className="text-sm font-medium text-foreground">No invoices are waiting for review.</p>
      <p className="text-xs text-muted-foreground">
        Submitted invoices that need an approval route will appear here.
      </p>
    </div>
  );
}

// ── Queue list item ──────────────────────────────────────────────────────────

function QueueItem({
  invoice,
  isSelected,
  onClick,
}: {
  invoice: PendingReviewInvoice;
  isSelected: boolean;
  onClick: () => void;
}) {
  const routeCount = invoice.available_routes.length;
  const actionableRoutes = invoice.available_routes.filter((r) => r.user_can_begin).length;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b transition-colors focus:outline-none focus:ring-1 focus:ring-primary ${
        isSelected
          ? "bg-primary/5 border-l-2 border-l-primary"
          : "hover:bg-accent border-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{invoice.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {invoice.vendor_name && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 shrink-0" />
                <span className="truncate">{invoice.vendor_name}</span>
              </span>
            )}
            {invoice.scope_node_name && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3 shrink-0" />
                <span>{invoice.scope_node_name}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              {timeAgo(invoice.created_at)}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-foreground">
            {fmtAmount(invoice.amount, invoice.currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {routeCount} route{routeCount !== 1 ? "s" : ""}
          </p>
          {actionableRoutes < routeCount && (
            <Badge variant="outline" className="mt-0.5 border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[10px] px-1">
              {actionableRoutes} actionable
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Route card ───────────────────────────────────────────────────────────────

function RouteCard({
  route,
  isSelected,
  onSelect,
  disabled,
}: {
  route: PendingReviewRoute;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled || !route.user_can_begin}
      className={`w-full text-left rounded-lg border px-3 py-2.5 text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-primary ${
        isSelected
          ? "border-primary bg-primary/10"
          : disabled || !route.user_can_begin
          ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
          : "border-border hover:bg-accent"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground leading-tight">{route.template_name}</p>
          {route.template_code && (
            <p className="mt-0.5 font-mono text-muted-foreground text-[10px]">{route.template_code}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
            <span>v{route.version_number}</span>
            {route.first_step_name && (
              <>
                <span>·</span>
                <span>First: {route.first_step_name}</span>
              </>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {isSelected ? (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
            </div>
          ) : (
            <div className={`h-5 w-5 rounded-full border-2 ${
              !route.user_can_begin ? "border-muted-foreground/30" : "border-muted-foreground/40"
            }`} />
          )}
        </div>
      </div>
      {!route.user_can_begin && (
        <p className="mt-1.5 text-[10px] text-muted-foreground/70 italic">
          You are not eligible to begin this route
        </p>
      )}
    </button>
  );
}

// ── Begin Review drawer ───────────────────────────────────────────────────────

function BeginReviewDrawer({
  invoice,
  onClose,
  onSuccess,
}: {
  invoice: PendingReviewInvoice;
  onClose: () => void;
  onSuccess: (instanceId: number, status: "activated" | "assignment_required") => void;
}) {
  const beginReview = useBeginInvoiceReview();
  const [selectedRoute, setSelectedRoute] = useState<PendingReviewRoute | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBegin = async () => {
    if (!selectedRoute) return;
    setError(null);
    try {
      const result = await beginReview.mutateAsync({
        invoiceId: invoice.id,
        templateVersionId: selectedRoute.version_id,
      });
      onSuccess(result.workflow_instance_id, result.status);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError("This invoice is already being processed. Refreshing queue.");
          onClose();
          return;
        }
        setError(err.message);
      } else {
        setError("Failed to begin review.");
      }
    }
  };

  const actionableRoutes = invoice.available_routes.filter((r) => r.user_can_begin);

  return (
    <Dialog open={true} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Begin Review
          </DialogTitle>
          <DialogDescription>
            Select an approval route to start the review process.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invoice summary */}
          <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-medium text-foreground">{invoice.title}</span>
            </div>
            {invoice.vendor_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendor</span>
                <span className="font-medium text-foreground">{invoice.vendor_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unit</span>
              <span className="font-medium text-foreground">{invoice.scope_node_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium text-foreground">
                {fmtAmount(invoice.amount, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span className="font-medium text-foreground">
                {new Date(invoice.created_at).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </span>
            </div>
          </div>

          <Separator />

          {/* Route selection */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">
              Approval Route
              <span className="ml-1.5 text-muted-foreground font-normal">
                ({actionableRoutes.length} you can begin)
              </span>
            </p>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {invoice.available_routes.map((route) => (
                <RouteCard
                  key={route.version_id}
                  route={route}
                  isSelected={selectedRoute?.version_id === route.version_id}
                  onSelect={() => setSelectedRoute(route)}
                  disabled={beginReview.isPending}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={beginReview.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleBegin}
              disabled={!selectedRoute || beginReview.isPending}
            >
              {beginReview.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-1.5 h-4 w-4" />
              )}
              Begin Review
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function PendingReviewPage() {
  const navigate = useNavigate();
  const { data: invoices = [], isLoading, isError, refetch } = usePendingReviewInvoices();
  const [selected, setSelected] = useState<PendingReviewInvoice | null>(null);

  const handleSuccess = (instanceId: number, status: "activated" | "assignment_required") => {
    setSelected(null);
    if (status === "activated") {
      toast.success("Review started.");
      navigate("/tasks");
    } else {
      toast.success("Approval route selected. Assign reviewers to start.");
      navigate(`/workflow-drafts/${instanceId}/assign`);
    }
  };

  return (
    <V2Shell>
      <div className="flex h-full overflow-hidden">
        {/* Queue panel */}
        <div className="flex w-72 shrink-0 flex-col border-r">
          {/* Header */}
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Inbox className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Pending Review</h2>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "—" : `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <QueueLoading />
            ) : isError ? (
              <QueueError onRetry={() => refetch()} />
            ) : invoices.length === 0 ? (
              <QueueEmpty />
            ) : (
              invoices.map((inv) => (
                <QueueItem
                  key={inv.id}
                  invoice={inv}
                  isSelected={selected?.id === inv.id}
                  onClick={() => setSelected(inv)}
                />
              ))
            )}
          </ScrollArea>
        </div>

        {/* Empty right panel when nothing selected */}
        <div className="flex flex-1 flex-col items-center justify-center text-center px-8">
          <Inbox className="h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {invoices.length > 0
              ? "Select an invoice to begin review"
              : "No invoices pending review"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Submitted invoices awaiting an approval route will appear here.
          </p>
        </div>
      </div>

      {/* Begin Review drawer */}
      {selected && (
        <BeginReviewDrawer
          invoice={selected}
          onClose={() => setSelected(null)}
          onSuccess={handleSuccess}
        />
      )}
    </V2Shell>
  );
}
