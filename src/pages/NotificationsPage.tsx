import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/hooks/useV2Notifications";
import { EVENT_TYPE_LABELS } from "@/lib/types/v2notification";
import type { NotificationStatus } from "@/lib/types/v2notification";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  CheckCircle2,
  CheckSquare,
  Loader2,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

// ── Status colors ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  sent: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function NotificationStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_COLORS[status] ?? ""} variant="outline">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// ── Page loading ──────────────────────────────────────────────────────────────

function PageLoading() {
  return (
    <div className="flex h-32 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

// ── Single notification row ────────────────────────────────────────────────────

function NotificationRow({
  notification,
  onMarkRead,
  isMarkingRead,
}: {
  notification: import("@/lib/types/v2notification").Notification;
  onMarkRead: (id: number) => void;
  isMarkingRead: boolean;
}) {
  const navigate = useNavigate();
  const isPending = notification.status === "pending";
  const isStepAssigned = notification.event_type === "STEP_ASSIGNED";

  const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-background px-4 py-3 hover:bg-accent/50">
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        <Bell className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">
            {EVENT_TYPE_LABELS[notification.event_type] ?? notification.event_type}
          </p>
          <NotificationStatusBadge status={notification.status} />
        </div>
        {notification.actor_user_email && (
          <p className="text-xs text-muted-foreground">
            by {notification.actor_user_email}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{timeAgo(notification.created_at)}</span>
          {notification.instance_id && (
            <span>Instance #{notification.instance_id}</span>
          )}
        </div>
        {notification.metadata && typeof notification.metadata === "object" && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {Object.entries(notification.metadata)
              .filter(([, v]) => v !== null && v !== undefined)
              .slice(0, 3)
              .map(([k, v]) => (
                <span key={k}>
                  <span className="font-medium text-foreground">{k}:</span>{" "}
                  {String(v)}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {isStepAssigned && notification.instance_id && (
          <button
            onClick={() => navigate("/tasks")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            title="Go to tasks"
          >
            <ExternalLink className="h-3 w-3" />
            Tasks
          </button>
        )}
        {isPending && (
          <button
            onClick={() => onMarkRead(notification.id)}
            disabled={isMarkingRead}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-green-600 disabled:opacity-50"
          >
            {isMarkingRead ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            Mark read
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type FilterTab = "all" | NotificationStatus;

const TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Read", value: "sent" },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const statusParam = filter === "all" ? undefined : filter;
  const { data: notifications = [], isLoading, isError } = useNotifications({ status: statusParam });

  const pendingCount = notifications.filter((n) => n.status === "pending").length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold">Notifications</h1>
            {pendingCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {pendingCount} pending
              </p>
            )}
          </div>
        </div>
        {pendingCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="gap-1.5"
          >
            {markAllRead.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckSquare className="h-4 w-4" />
            )}
            Mark all read
          </Button>
        )}
      </header>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-border px-6 py-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === tab.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl space-y-2 p-6">
          {isLoading && <PageLoading />}

          {isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-6 text-center text-sm text-destructive">
              Failed to load notifications.
            </div>
          )}

          {!isLoading && !isError && notifications.length === 0 && (
            <div className="rounded-lg border border-border bg-secondary/20 py-12 text-center">
              <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {filter === "all"
                  ? "No notifications yet."
                  : filter === "pending"
                  ? "No pending notifications."
                  : "No read notifications."}
              </p>
            </div>
          )}

          {!isLoading && !isError && notifications.length > 0 && (
            <div className="space-y-2">
              {notifications.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onMarkRead={(id) => markRead.mutate(id)}
                  isMarkingRead={markRead.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
