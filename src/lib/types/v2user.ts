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
  is_vendor_portal_user?: boolean;
  user_type?: "internal" | "vendor";
  vendor_id?: string | null;
  vendor_name?: string | null;
}

export interface CreateUserRequest {
  email: string;
  first_name?: string;
  last_name?: string;
  employee_id?: string;
  is_active?: boolean;
  role: string;
  scope_node: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  employee_id?: string | null;
  is_active?: boolean;
}

export interface WorkflowResponsibilityItem {
  task_kind: "step" | "branch";
  task_id: number;
  instance_id: number;
  step_name: string;
  group_name: string;
  required_role: string;
  scope_node_id: number;
  scope_node_name: string;
  subject_type: string;
  subject_id: number;
  subject_label: string;
  vendor_name: string | null;
}

export interface WorkflowResponsibilityUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
}

export interface WorkflowResponsibilityPreview {
  user: WorkflowResponsibilityUser;
  counts: {
    steps: number;
    branches: number;
    total: number;
  };
  responsibilities: WorkflowResponsibilityItem[];
  eligible_replacements: WorkflowResponsibilityUser[];
}

export interface BulkWorkflowReassignmentResponse {
  steps_reassigned: number;
  branches_reassigned: number;
  total_reassigned: number;
  remaining: {
    steps: number;
    branches: number;
    total: number;
  };
}

// ── Full name helper ──────────────────────────────────────────────────────────

export function getUserFullName(user: V2User): string {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : user.email;
}

// ── Paginated response ────────────────────────────────────────────────────────

export type UserListResponse = PaginatedResponse<V2User>;
