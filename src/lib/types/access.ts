// ── V2 Backend Types ────────────────────────────────────────────────────────────
// Reflects NewBackend/apps/access/api/serializers/

// ── Roles ──────────────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  org: string;
  name: string;
  code: string;
  node_type_scope: string; // empty = all node types
  is_active: boolean;
  created_at: string;
}

export interface CreateRoleRequest {
  org: string;
  name: string;
  code: string;
  node_type_scope?: string;
}

// ── Permissions ────────────────────────────────────────────────────────────────

export interface Permission {
  id: string;
  action: string;
  resource: string;
  description: string;
}

// ── Role Permissions ───────────────────────────────────────────────────────────

export interface RolePermission {
  id: string;
  role: string;
  permission: string;
  permission_detail: Permission;
}

export interface CreateRolePermissionRequest {
  role: string;
  permission: string;
}

// ── User Role Assignments ─────────────────────────────────────────────────────

export interface UserRoleAssignment {
  id: string;
  user: string;
  role: string;
  scope_node: string;
  created_at: string;
}

export interface CreateUserRoleAssignmentRequest {
  user: string;
  role: string;
  scope_node: string;
}

// ── User Scope Assignments ─────────────────────────────────────────────────────

export interface UserScopeAssignment {
  id: string;
  user: string;
  scope_node: string;
  assignment_type: string;
  created_at: string;
}

// ── V2 User (from /me/) ────────────────────────────────────────────────────────

export interface V2User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}
