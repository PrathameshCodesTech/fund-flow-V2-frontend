// ── Backend response shapes ───────────────────────────────────────────────────
// These mirror the Django REST Framework serializers exactly.

/** Returned by CurrentUserProfileSerializer (nested inside CurrentUserSerializer) */
export interface BackendUserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  employee_id: string | null;
  phone: string | null;
  is_staff: boolean;
  is_active: boolean;
}

export interface BackendRoleSummary {
  id: string;
  code: string;
  name: string;
}

export interface BackendOrgUnitSummary {
  id: string;
  code: string;
  name: string;
  unit_type: string;
  organization_id: string;
  organization_name: string;
  legal_entity_id: string | null;
  legal_entity_name: string;
}

export interface BackendRoleAssignment {
  id: string;
  role: BackendRoleSummary;
  org_unit: BackendOrgUnitSummary | null;
  valid_from: string | null;
  valid_until: string | null;
}

export interface BackendOrgAssignment {
  id: string;
  org_unit: BackendOrgUnitSummary;
  is_primary: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

export interface BackendModuleAccess {
  id: string;
  code: string;
  name: string;
}

/**
 * Shape returned by CurrentUserSerializer — used in:
 *   POST /api/v1/auth/login/  → response.user_context
 *   GET  /api/v1/auth/me/     → the full response body
 */
export interface CurrentUserResponse {
  user: BackendUserProfile;
  assigned_roles: BackendRoleAssignment[];
  org_assignments: BackendOrgAssignment[];
  primary_org_assignment: BackendOrgAssignment | null;
  accessible_modules: BackendModuleAccess[];
  /** Stable capability strings computed server-side from role assignments. */
  capabilities: string[];
}

/**
 * Shape returned by POST /api/v1/auth/login/
 * { "token": "...", "user_context": { ...CurrentUserSerializer... } }
 */
export interface LoginResponse {
  token: string;
  user_context: CurrentUserResponse;
}

// ── V2 Backend Types ────────────────────────────────────────────────────────────
// These reflect the actual V2 backend serializers.
// V2's /login/ returns { user, access, refresh } — no user_context wrapper.

export interface V2AssignedRole {
  code: string;
  name: string;
}

/** V2 UserSerializer — returned by GET /api/v1/auth/me/ and POST /api/v1/auth/login/ */
export interface V2User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_id: string | null;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  assigned_roles: V2AssignedRole[];
  /** Stable capability strings computed server-side from role assignments. */
  capabilities: string[];
  /** True when the user has an active UserVendorAssignment (vendor portal user). */
  is_vendor_portal_user: boolean;
  vendor_id: string | null;
  vendor_name: string | null;
}

/** V2 login response: { user: V2User, access: string, refresh: string } */
export interface V2LoginResponse {
  user: V2User;
  access: string;
  refresh: string;
}

// ── Request shape ─────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}
