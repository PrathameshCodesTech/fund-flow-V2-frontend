import { apiClient } from "./client";
import type {
  V2User,
  UserListResponse,
  CreateUserRequest,
  UpdateUserRequest,
  WorkflowResponsibilityPreview,
  BulkWorkflowReassignmentResponse,
} from "../types/v2user";

// ── List / Search ─────────────────────────────────────────────────────────────

export function listUsers(params?: {
  q?: string;
  is_active?: boolean;
  user_type?: "internal" | "vendor";
  page?: number;
  page_size?: number;
}): Promise<UserListResponse> {
  return apiClient.get<UserListResponse>("/api/v1/users/", params);
}

export function getUser(id: string): Promise<V2User> {
  return apiClient.get<V2User>(`/api/v1/users/${id}/`);
}

// ── Create ───────────────────────────────────────────────────────────────────

export function createUser(data: CreateUserRequest): Promise<V2User> {
  return apiClient.post<V2User>("/api/v1/users/", data);
}

// ── Update ───────────────────────────────────────────────────────────────────

export function updateUser(id: string, data: UpdateUserRequest): Promise<V2User> {
  return apiClient.patch<V2User>(`/api/v1/users/${id}/`, data);
}

export function sendPasswordReset(id: string): Promise<{ detail: string; email: string }> {
  return apiClient.post<{ detail: string; email: string }>(`/api/v1/users/${id}/send-password-reset/`);
}

export function getWorkflowResponsibilities(
  id: string,
): Promise<WorkflowResponsibilityPreview> {
  return apiClient.get<WorkflowResponsibilityPreview>(
    `/api/v1/users/${id}/workflow-responsibilities/`,
  );
}

export function reassignWorkflowResponsibilities(
  id: string,
  data: { new_user: string; reason: string },
): Promise<BulkWorkflowReassignmentResponse> {
  return apiClient.post<BulkWorkflowReassignmentResponse>(
    `/api/v1/users/${id}/reassign-workflow-responsibilities/`,
    data,
  );
}

export function validatePasswordReset(uid: string, token: string): Promise<{ email: string; name: string }> {
  return apiClient.get<{ email: string; name: string }>(`/api/v1/auth/password-reset/${uid}/${token}/`);
}

export function confirmPasswordReset(
  uid: string,
  token: string,
  password: string,
): Promise<{ detail: string }> {
  return apiClient.post<{ detail: string }>(
    `/api/v1/auth/password-reset/${uid}/${token}/confirm/`,
    { password },
  );
}
