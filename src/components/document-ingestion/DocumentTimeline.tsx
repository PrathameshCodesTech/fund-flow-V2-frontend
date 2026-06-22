import { cn } from "@/lib/utils";
import { EVENT_TYPE_LABELS, type ExternalDocumentEvent } from "@/lib/types/documentIngestion";
import {
  FileText,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  CheckCheck,
  Edit,
  Link,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface DocumentTimelineProps {
  events: ExternalDocumentEvent[];
  className?: string;
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  discovered: FileText,
  downloaded: Download,
  extracted: Search,
  matched: CheckCircle2,
  match_failed: XCircle,
  applied: CheckCheck,
  corrected: Edit,
  linked: Link,
  reprocessed: RefreshCw,
  quarantined: ShieldAlert,
  error: AlertTriangle,
};

const EVENT_COLORS: Record<string, string> = {
  discovered: "bg-slate-100 text-slate-600",
  downloaded: "bg-blue-100 text-blue-600",
  extracted: "bg-indigo-100 text-indigo-600",
  matched: "bg-green-100 text-green-600",
  match_failed: "bg-red-100 text-red-600",
  applied: "bg-green-100 text-green-600",
  corrected: "bg-amber-100 text-amber-600",
  linked: "bg-purple-100 text-purple-600",
  reprocessed: "bg-blue-100 text-blue-600",
  quarantined: "bg-red-100 text-red-600",
  error: "bg-red-100 text-red-600",
};

export function DocumentTimeline({ events, className }: DocumentTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        No events recorded
      </div>
    );
  }

  // Sort events by created_at descending (newest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className={cn("relative", className)}>
      {/* Timeline line */}
      <div className="absolute left-5 top-3 bottom-3 w-px bg-gray-200" />

      <div className="space-y-4">
        {sortedEvents.map((event) => {
          const Icon = EVENT_ICONS[event.event_type] || AlertTriangle;
          const colorClass = EVENT_COLORS[event.event_type] || "bg-gray-100 text-gray-600";
          const date = new Date(event.created_at);

          return (
            <div key={event.id} className="relative flex gap-4 pl-0">
              {/* Icon */}
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  colorClass,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              {/* Content */}
              <div className="flex-1 pt-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {EVENT_TYPE_LABELS[event.event_type as keyof typeof EVENT_TYPE_LABELS] ||
                        event.event_type}
                    </p>
                    {event.message && (
                      <p className="text-sm text-gray-600 mt-0.5">{event.message}</p>
                    )}
                    {event.actor_email && (
                      <p className="text-xs text-gray-500 mt-1">by {event.actor_email}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className="text-xs text-gray-500"
                      title={format(date, "PPpp")}
                    >
                      {formatDistanceToNow(date, { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="mt-2 text-xs bg-gray-50 rounded-md p-2">
                    <pre className="whitespace-pre-wrap text-gray-600">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
