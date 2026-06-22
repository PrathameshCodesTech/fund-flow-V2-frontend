import { cn } from "@/lib/utils";
import {
  DOCUMENT_STATUS_LABELS,
  type ExternalDocumentStatus,
  type DocumentCountsResponse,
} from "@/lib/types/documentIngestion";
import {
  FileText,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  CheckCheck,
  Copy,
  ShieldAlert,
  XCircle,
} from "lucide-react";

interface StatusCountsBarProps {
  counts: DocumentCountsResponse;
  selectedStatus?: ExternalDocumentStatus;
  onStatusClick: (status: ExternalDocumentStatus | undefined) => void;
  className?: string;
}

const STATUS_ICONS: Record<ExternalDocumentStatus, React.ElementType> = {
  discovered: FileText,
  downloaded: Download,
  extracted: Search,
  matched: CheckCircle2,
  review_required: AlertTriangle,
  applied: CheckCheck,
  duplicate: Copy,
  quarantined: ShieldAlert,
  failed: XCircle,
};

const STATUS_COLORS: Record<ExternalDocumentStatus, { bg: string; text: string; active: string }> = {
  discovered: { bg: "bg-slate-50", text: "text-slate-600", active: "ring-2 ring-slate-400" },
  downloaded: { bg: "bg-blue-50", text: "text-blue-600", active: "ring-2 ring-blue-400" },
  extracted: { bg: "bg-indigo-50", text: "text-indigo-600", active: "ring-2 ring-indigo-400" },
  matched: { bg: "bg-emerald-50", text: "text-emerald-600", active: "ring-2 ring-emerald-400" },
  review_required: { bg: "bg-amber-50", text: "text-amber-600", active: "ring-2 ring-amber-400" },
  applied: { bg: "bg-green-50", text: "text-green-600", active: "ring-2 ring-green-400" },
  duplicate: { bg: "bg-orange-50", text: "text-orange-600", active: "ring-2 ring-orange-400" },
  quarantined: { bg: "bg-red-50", text: "text-red-600", active: "ring-2 ring-red-400" },
  failed: { bg: "bg-red-50", text: "text-red-600", active: "ring-2 ring-red-400" },
};

// Order statuses for display (review_required first)
const ORDERED_STATUSES: ExternalDocumentStatus[] = [
  "review_required",
  "discovered",
  "downloaded",
  "extracted",
  "matched",
  "applied",
  "duplicate",
  "quarantined",
  "failed",
];

export function StatusCountsBar({
  counts,
  selectedStatus,
  onStatusClick,
  className,
}: StatusCountsBarProps) {
  // counts.by_status is already an object map Record<ExternalDocumentStatus, number>
  const statusCounts = counts.by_status;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {/* All button */}
      <button
        onClick={() => onStatusClick(undefined)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
          "hover:shadow-sm",
          selectedStatus === undefined
            ? "bg-primary/10 border-primary/30 ring-2 ring-primary/50"
            : "bg-white border-gray-200 hover:border-gray-300",
        )}
      >
        <span className="text-sm font-medium">All</span>
        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
          {counts.total}
        </span>
      </button>

      {/* Status buttons */}
      {ORDERED_STATUSES.map((status) => {
        const count = statusCounts[status] || 0;
        if (count === 0) return null;

        const Icon = STATUS_ICONS[status];
        const colors = STATUS_COLORS[status];
        const isSelected = selectedStatus === status;

        return (
          <button
            key={status}
            onClick={() => onStatusClick(isSelected ? undefined : status)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
              "hover:shadow-sm",
              colors.bg,
              colors.text,
              isSelected ? colors.active : "border-transparent hover:border-gray-200",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{DOCUMENT_STATUS_LABELS[status]}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full", colors.bg, "brightness-95")}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
