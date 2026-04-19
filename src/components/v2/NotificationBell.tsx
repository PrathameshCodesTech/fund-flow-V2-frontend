import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  usePendingNotificationCount,
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/hooks/useV2Notifications";
import { EVENT_TYPE_LABELS } from "@/lib/types/v2notification";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  CheckCircle2,
  CheckSquare,
  Loader2,
} from "lucide-react";

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: pendingCount = 0, isLoading: countLoading } = usePendingNotificationCount();
  const { data: notifications = [], isLoading: listLoading } = useNotifications(
    open ? { status: "pending" } : undefined,
  );
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }
  }, [open]);

  const handleMarkRead = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await markRead.mutateAsync(id);
    } catch {
      // mutation error surfaced via isError
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
    } catch {
      // mutation error
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Notifications"
      >
        {countLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Bell className="h-4 w-4 text-muted-foreground" />
        )}
        {!countLoading && pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-80 rounded-lg border border-border bg-background shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-medium">Notifications</p>
            {pendingCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {markAllRead.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckSquare className="h-3 w-3" />
                )}
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <ScrollArea className="max-h-72">
            {listLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!listLoading && notifications.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No pending notifications
              </div>
            )}
            {!listLoading && notifications.length > 0 && (
              <div className="py-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">
                          {EVENT_TYPE_LABELS[n.event_type] ?? n.event_type}
                        </p>
                      </div>
                      {n.actor_user_email && (
                        <p className="text-xs text-muted-foreground">
                          by {n.actor_user_email}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {n.metadata && typeof n.metadata === "object"
                          ? Object.entries(n.metadata)
                              .filter(([, v]) => v !== null && v !== undefined)
                              .slice(0, 2)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ")
                          : null}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant="outline"
                        className="text-xs bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300"
                      >
                        Pending
                      </Badge>
                      <button
                        onClick={(e) => handleMarkRead(e, n.id)}
                        disabled={markRead.isPending}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-green-600 disabled:opacity-50"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Read
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border px-3 py-2">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
