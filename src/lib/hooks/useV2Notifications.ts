import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../api/v2notification";
import type { NotificationStatus } from "../types/v2notification";

// ── List notifications ─────────────────────────────────────────────────────────

export function useNotifications(params?: { status?: NotificationStatus }) {
  return useQuery({
    queryKey: ["v2", "notifications", params],
    queryFn: () => listNotifications(params),
  });
}

// ── Pending notification count (for bell badge) ─────────────────────────────────

export function usePendingNotificationCount() {
  return useQuery({
    queryKey: ["v2", "notifications", "pending"],
    queryFn: () => listNotifications({ status: "pending" }),
    select: (data) => data.length,
    refetchInterval: 30_000, // poll every 30 seconds
  });
}

// ── Mark single as read ───────────────────────────────────────────────────────

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "notifications"] });
    },
  });
}

// ── Mark all as read ──────────────────────────────────────────────────────────

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "notifications"] });
    },
  });
}
