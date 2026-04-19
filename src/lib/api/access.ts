import { apiClient } from "./client";
import type {
  Role,
  CreateRoleRequest,
  Permission,
  RolePermission,
  CreateRolePermissionRequest,
  UserRoleAssignment,
  CreateUserRoleAssignmentRequest,
  UserScopeAssignment,
} from "../types/access";
import type { PaginatedResponse } from "../types/core";

// ── Roles ─────────────────────────────────────────────────────────────────────

export function listRoles(params?: {
  org?: string;
}): Promise<PaginatedResponse<Role>> {
  return apiClient.get<PaginatedResponse<Role>>("/api/v1/access/roles/", params);
}

export function getRole(id: string): Promise<Role> {
  return apiClient.get<Role>(`/api/v1/access/roles/${id}/`);
}

export function createRole(data: CreateRoleRequest): Promise<Role> {
  return apiClient.post<Role>("/api/v1/access/roles/", data);
}

export function updateRole(id: string, data: Partial<CreateRoleRequest>): Promise<Role> {
  return apiClient.patch<Role>(`/api/v1/access/roles/${id}/`, data);
}

// ── Permissions (read-only) ────────────────────────────────────────────────────

export function listPermissions(): Promise<PaginatedResponse<Permission>> {
  return apiClient.get<PaginatedResponse<Permission>>("/api/v1/access/permissions/");
}

// ── Role Permissions ───────────────────────────────────────────────────────────

export function listRolePermissions(params?: {
  role?: string;
}): Promise<RolePermission[]> {
  return apiClient.get<RolePermission[]>("/api/v1/access/role-permissions/", params);
}

export function grantPermissionToRole(
  data: CreateRolePermissionRequest,
): Promise<RolePermission> {
  return apiClient.post<RolePermission>("/api/v1/access/role-permissions/", data);
}

export function revokePermissionFromRole(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/access/role-permissions/${id}/`);
}

// ── User Role Assignments ───────────────────────────────────────────────────────

export function listUserRoleAssignments(params?: {
  user?: string;
  role?: string;
  scope_node?: string;
}): Promise<UserRoleAssignment[]> {
  return apiClient.get<UserRoleAssignment[]>(
    "/api/v1/access/role-assignments/",
    params,
  );
}

export function createUserRoleAssignment(
  data: CreateUserRoleAssignmentRequest,
): Promise<UserRoleAssignment> {
  return apiClient.post<UserRoleAssignment>(
    "/api/v1/access/role-assignments/",
    data,
  );
}

export function deleteUserRoleAssignment(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/access/role-assignments/${id}/`);
}

// ── User Scope Assignments ─────────────────────────────────────────────────────

export function listUserScopeAssignments(params?: {
  user?: string;
  scope_node?: string;
}): Promise<UserScopeAssignment[]> {
  return apiClient.get<UserScopeAssignment[]>(
    "/api/v1/access/scope-assignments/",
    params,
  );
}
