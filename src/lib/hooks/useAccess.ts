import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listRoles,
  createRole,
  listPermissions,
  listRolePermissions,
  grantPermissionToRole,
  revokePermissionFromRole,
  listUserRoleAssignments,
  createUserRoleAssignment,
  deleteUserRoleAssignment,
  listUserScopeAssignments,
} from "../api/access";
import type {
  CreateRoleRequest,
  CreateRolePermissionRequest,
  CreateUserRoleAssignmentRequest,
} from "../types/access";

// ── Roles ─────────────────────────────────────────────────────────────────────

export function useRoles(orgId?: string) {
  return useQuery({
    queryKey: ["v2", "roles", orgId],
    queryFn: async () => {
      const res = await listRoles(orgId ? { org: orgId } : undefined);
      return res.results;
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoleRequest) => createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "roles"] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRoleRequest> }) =>
      updateRole(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "roles"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "role", id] });
    },
  });
}

export function useActivateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; is_active: boolean }) =>
      updateRole(data.id, { name: "", code: "", org: "", is_active: data.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "roles"] });
    },
  });
}

// Real toggle using partial update
export function useToggleRoleActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateRole(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "roles"] });
    },
  });
}

// ── Permissions ────────────────────────────────────────────────────────────────

export function usePermissions() {
  return useQuery({
    queryKey: ["v2", "permissions"],
    queryFn: async () => {
      const res = await listPermissions();
      return res.results;
    },
  });
}

// ── Role Permissions ─────────────────────────────────────────────────────────

export function useRolePermissions(roleId?: string) {
  return useQuery({
    queryKey: ["v2", "rolePermissions", roleId],
    queryFn: async () => {
      const res = await listRolePermissions(roleId ? { role: roleId } : undefined);
      // Role-permissions list is not paginated (small fixed set)
      return Array.isArray(res) ? res : res.results;
    },
    enabled: !!roleId,
  });
}

export function useGrantPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRolePermissionRequest) =>
      grantPermissionToRole(data),
    onSuccess: (_newRp, _vars, _ctx) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "rolePermissions"] });
    },
  });
}

export function useRevokePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokePermissionFromRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "rolePermissions"] });
    },
  });
}

// ── User Role Assignments ──────────────────────────────────────────────────────

export function useUserRoleAssignments(params?: {
  user?: string;
  role?: string;
  scope_node?: string;
}) {
  return useQuery({
    queryKey: ["v2", "userRoleAssignments", params],
    queryFn: async () => {
      const res = await listUserRoleAssignments(params);
      return Array.isArray(res) ? res : res.results;
    },
  });
}

export function useCreateUserRoleAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserRoleAssignmentRequest) =>
      createUserRoleAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["v2", "userRoleAssignments"],
      });
    },
  });
}

export function useDeleteUserRoleAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUserRoleAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["v2", "userRoleAssignments"],
      });
    },
  });
}

// ── User Scope Assignments ─────────────────────────────────────────────────────

export function useUserScopeAssignments(params?: {
  user?: string;
  scope_node?: string;
}) {
  return useQuery({
    queryKey: ["v2", "userScopeAssignments", params],
    queryFn: async () => {
      const res = await listUserScopeAssignments(params);
      return Array.isArray(res) ? res : res.results;
    },
  });
}
