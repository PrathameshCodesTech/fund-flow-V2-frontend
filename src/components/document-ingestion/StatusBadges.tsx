import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  DOCUMENT_TYPE_LABELS,
  MATCH_STATUS_LABELS,
  MATCH_STATUS_COLORS,
  type ExternalDocumentStatus,
  type ExternalDocumentType,
  type MatchStatus,
} from "@/lib/types/documentIngestion";

// ── Document Status Badge ────────────────────────────────────────────────────

interface DocumentStatusBadgeProps {
  status: ExternalDocumentStatus;
  className?: string;
}

export function DocumentStatusBadge({ status, className }: DocumentStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(DOCUMENT_STATUS_COLORS[status], "border-0", className)}
    >
      {DOCUMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

// ── Document Type Badge ──────────────────────────────────────────────────────

interface DocumentTypeBadgeProps {
  type: ExternalDocumentType;
  className?: string;
}

export function DocumentTypeBadge({ type, className }: DocumentTypeBadgeProps) {
  const colors: Record<ExternalDocumentType, string> = {
    unknown: "bg-slate-100 text-slate-700",
    invoice: "bg-blue-100 text-blue-700",
    payment_advice: "bg-purple-100 text-purple-700",
  };

  return (
    <Badge
      variant="outline"
      className={cn(colors[type], "border-0", className)}
    >
      {DOCUMENT_TYPE_LABELS[type]}
    </Badge>
  );
}

// ── Match Status Badge ───────────────────────────────────────────────────────

interface MatchStatusBadgeProps {
  status: MatchStatus;
  className?: string;
}

export function MatchStatusBadge({ status, className }: MatchStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(MATCH_STATUS_COLORS[status], "border-0", className)}
    >
      {MATCH_STATUS_LABELS[status]}
    </Badge>
  );
}
