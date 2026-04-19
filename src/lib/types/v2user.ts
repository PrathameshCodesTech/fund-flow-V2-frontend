// ── V2 User Types ──────────────────────────────────────────────────────────────
// Reflects NewBackend/apps/users/api/serializers/users.py (UserSerializer)

import type { PaginatedResponse } from "./core";

// ── User ─────────────────────────────────────────────────────────────────────

export interface V2User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_id: string | null;
  is_active: boolean;
  date_joined: string;
}

export interface CreateUserRequest {
  email: string;
  first_name?: string;
  last_name?: string;
  employee_id?: string;
  is_active?: boolean;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  employee_id?: string | null;
  is_active?: boolean;
}

// ── Full name helper ──────────────────────────────────────────────────────────

export function getUserFullName(user: V2User): string {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : user.email;
}

// ── Paginated response ────────────────────────────────────────────────────────

export type UserListResponse = PaginatedResponse<V2User>;
