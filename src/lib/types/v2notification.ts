// ── V2 Notification Types ──────────────────────────────────────────────────────
// Reflects NewBackend/apps/notifications/api/serializers.py

export type NotificationStatus = "pending" | "sent" | "failed";
export type NotificationChannel = "in_app" | "email" | "slack";

export interface Notification {
  id: number;
  channel: NotificationChannel;
  status: NotificationStatus;
  sent_at: string | null;
  created_at: string;
  event_id: number;
  event_type: string;
  actor_user_id: number | null;
  actor_user_email: string | null;
  target_user_id: number | null;
  instance_id: number;
  metadata: Record<string, unknown>;
}

// ── Event type labels ─────────────────────────────────────────────────────────

export const EVENT_TYPE_LABELS: Record<string, string> = {
  STEP_ASSIGNED: "Assigned to you",
  STEP_APPROVED: "Step approved",
  STEP_REJECTED: "Step rejected",
  STEP_ORPHANED: "Step orphaned",
  STEP_REASSIGNED: "Step reassigned",
  INSTANCE_STUCK: "Instance stuck",
  INSTANCE_FROZEN: "Instance frozen",
  INSTANCE_APPROVED: "Workflow approved",
  INSTANCE_REJECTED: "Workflow rejected",
};
