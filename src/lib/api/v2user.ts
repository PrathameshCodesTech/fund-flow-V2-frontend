import { apiClient } from "./client";
import type { V2User, UserListResponse, CreateUserRequest, UpdateUserRequest } from "../types/v2user";

// ── List / Search ─────────────────────────────────────────────────────────────

export function listUsers(params?: {
  q?: string;
  is_active?: boolean;
  page?: number;
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
