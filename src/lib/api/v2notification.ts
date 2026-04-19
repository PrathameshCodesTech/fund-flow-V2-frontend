import { apiClient } from "./client";
import type { Notification, NotificationStatus } from "../types/v2notification";

// ── List notifications ─────────────────────────────────────────────────────────

export function listNotifications(params?: {
  status?: NotificationStatus;
}): Promise<Notification[]> {
  return apiClient.get<Notification[]>("/api/v1/notifications/", params);
}

// ── Mark single notification as read ───────────────────────────────────────────

export function markNotificationRead(
  id: number,
): Promise<Notification> {
  return apiClient.post<Notification>(
    `/api/v1/notifications/${id}/mark-read/`,
  );
}

// ── Mark all notifications as read ─────────────────────────────────────────────

export function markAllNotificationsRead(): Promise<{ marked_read: number }> {
  return apiClient.post<{ marked_read: number }>(
    "/api/v1/notifications/mark-all-read/",
  );
}
