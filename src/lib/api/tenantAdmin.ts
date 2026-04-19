import { apiClient } from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TenantUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  employee_id: string;
  phone: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
}

export interface TenantUserCreate {
  email: string;
  password?: string;  // omit to create inactive user without password (activation via email)
  org_unit: string;   // required — user must be placed in an org unit on creation
  first_name?: string;
  last_name?: string;
  employee_id?: string;
  phone?: string;
  is_active?: boolean;
}

export interface TenantUserUpdate {
  first_name?: string;
  last_name?: string;
  employee_id?: string;
  phone?: string;
  is_active?: boolean;
}

export interface LegalEntity {
  id: string;
  organization_id: string;
  organization_name: string;
  name: string;
  short_name: string;
  registration_number: string;
  tax_id: string;
  country: string;
  currency: string;
  is_active: boolean;
}

export interface LegalEntityWrite {
  organization: string;
  name: string;
  short_name?: string;
  registration_number?: string;
  tax_id?: string;
  country?: string;
  currency?: string;
  is_active?: boolean;
}

export interface OrgUnitType {
  id: string;
  code: string;
  name: string;
  level: number;
  is_active: boolean;
}

export interface OrgUnitTypeWrite {
  code: string;
  name: string;
  level: number;
  is_active?: boolean;
}

export interface OrgUnit {
  id: string;
  organization_id: string;
  organization_name: string;
  legal_entity_id: string | null;
  legal_entity_name: string;
  parent_id: string | null;
  code: string;
  name: string;
  unit_type: { id: string; code: string; name: string; level: number };
  depth: number;
  sort_order: number;
  is_active: boolean;
}

export interface OrgUnitWrite {
  organization: string;
  legal_entity?: string | null;
  unit_type: string;
  parent?: string | null;
  code: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface OrgUnitTreeNode extends OrgUnit {
  children: OrgUnitTreeNode[];
}

export interface UserOrgAssignment {
  id: string;
  user_id: string;
  user_email: string;
  org_unit_id: string;
  org_unit_name: string;
  org_unit_code: string;
  is_primary: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

export interface UserOrgAssignmentWrite {
  user: string;
  org_unit: string;
  is_primary?: boolean;
  valid_from?: string | null;
  valid_until?: string | null;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  user_email: string;
  role_id: string;
  role_code: string;
  role_name: string;
  org_unit_id: string | null;
  org_unit_name: string;
  valid_from: string | null;
  valid_until: string | null;
}

export interface UserRoleAssignmentWrite {
  user: string;
  role: string;
  org_unit?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
}

export interface RoleSummary {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

// ── Organization ──────────────────────────────────────────────────────────────

export const tenantAdminApi = {
  // LegalEntity
  listLegalEntities(params?: { organization?: string; active_only?: string }) {
    return apiClient.get<LegalEntity[]>('/api/v1/org/legal-entities/', params);
  },
  createLegalEntity(data: LegalEntityWrite) {
    return apiClient.post<LegalEntity>('/api/v1/org/legal-entities/create/', data);
  },
  updateLegalEntity(id: string, data: Partial<LegalEntityWrite>) {
    return apiClient.patch<LegalEntity>(`/api/v1/org/legal-entities/${id}/`, data);
  },

  // OrgUnitType
  listOrgUnitTypes(params?: { active_only?: string }) {
    return apiClient.get<OrgUnitType[]>('/api/v1/org/unit-types/', params);
  },
  createOrgUnitType(data: OrgUnitTypeWrite) {
    return apiClient.post<OrgUnitType>('/api/v1/org/unit-types/', data);
  },
  updateOrgUnitType(id: string, data: Partial<OrgUnitTypeWrite>) {
    return apiClient.patch<OrgUnitType>(`/api/v1/org/unit-types/${id}/`, data);
  },

  // OrgUnit
  listOrgUnits(params?: { organization?: string; legal_entity?: string; active_only?: string }) {
    return apiClient.get<OrgUnit[]>('/api/v1/org/org-units/', params);
  },
  getOrgUnitTree(params?: { organization?: string; active_only?: string }) {
    return apiClient.get<OrgUnitTreeNode[]>('/api/v1/org/org-units/tree/', params);
  },
  createOrgUnit(data: OrgUnitWrite) {
    return apiClient.post<OrgUnit>('/api/v1/org/org-units/create/', data);
  },
  updateOrgUnit(id: string, data: Partial<OrgUnitWrite>) {
    return apiClient.patch<OrgUnit>(`/api/v1/org/org-units/${id}/`, data);
  },

  // Users
  listUsers(params?: { active_only?: string }) {
    return apiClient.get<TenantUser[]>('/api/v1/iam/users/', params);
  },
  createUser(data: TenantUserCreate) {
    return apiClient.post<TenantUser>('/api/v1/iam/users/', data);
  },
  updateUser(id: string, data: TenantUserUpdate) {
    return apiClient.patch<TenantUser>(`/api/v1/iam/users/${id}/`, data);
  },
  sendAccessEmail(id: string) {
    return apiClient.post<void>(`/api/v1/iam/users/${id}/send-access-email/`, {});
  },

  // UserOrgAssignment
  listOrgAssignments(params?: { user?: string; org_unit?: string }) {
    return apiClient.get<UserOrgAssignment[]>('/api/v1/iam/org-assignments/', params);
  },
  createOrgAssignment(data: UserOrgAssignmentWrite) {
    return apiClient.post<UserOrgAssignment>('/api/v1/iam/org-assignments/', data);
  },
  deleteOrgAssignment(id: string) {
    return apiClient.delete(`/api/v1/iam/org-assignments/${id}/`);
  },

  // UserRoleAssignment
  listRoleAssignments(params?: { user?: string; role?: string }) {
    return apiClient.get<UserRoleAssignment[]>('/api/v1/iam/role-assignments/', params);
  },
  createRoleAssignment(data: UserRoleAssignmentWrite) {
    return apiClient.post<UserRoleAssignment>('/api/v1/iam/role-assignments/', data);
  },
  deleteRoleAssignment(id: string) {
    return apiClient.delete(`/api/v1/iam/role-assignments/${id}/`);
  },

  // Roles (read-only, for dropdowns)
  listRoles() {
    return apiClient.get<RoleSummary[]>('/api/v1/iam/roles/');
  },
};
