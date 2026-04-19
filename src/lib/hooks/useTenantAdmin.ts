import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantAdminApi } from '../api/tenantAdmin';
import type {
  LegalEntityWrite,
  OrgUnitTypeWrite,
  OrgUnitWrite,
  TenantUserCreate,
  TenantUserUpdate,
  UserOrgAssignmentWrite,
  UserRoleAssignmentWrite,
} from '../api/tenantAdmin';

// ── LegalEntity ───────────────────────────────────────────────────────────────

export function useLegalEntitiesAdmin(organizationId?: string) {
  return useQuery({
    queryKey: ['admin', 'legalEntities', organizationId],
    queryFn: () => tenantAdminApi.listLegalEntities({
      organization: organizationId,
      active_only: 'false',
    }),
  });
}

export function useCreateLegalEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LegalEntityWrite) => tenantAdminApi.createLegalEntity(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'legalEntities'] }),
  });
}

export function useUpdateLegalEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LegalEntityWrite> }) =>
      tenantAdminApi.updateLegalEntity(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'legalEntities'] }),
  });
}

// ── OrgUnitType ───────────────────────────────────────────────────────────────

export function useOrgUnitTypes() {
  return useQuery({
    queryKey: ['admin', 'orgUnitTypes'],
    queryFn: () => tenantAdminApi.listOrgUnitTypes({ active_only: 'false' }),
  });
}

export function useCreateOrgUnitType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OrgUnitTypeWrite) => tenantAdminApi.createOrgUnitType(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'orgUnitTypes'] }),
  });
}

export function useUpdateOrgUnitType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OrgUnitTypeWrite> }) =>
      tenantAdminApi.updateOrgUnitType(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'orgUnitTypes'] }),
  });
}

// ── OrgUnit ───────────────────────────────────────────────────────────────────

export function useOrgUnitsAdmin(organizationId?: string) {
  return useQuery({
    queryKey: ['admin', 'orgUnits', organizationId],
    queryFn: () => tenantAdminApi.listOrgUnits({
      organization: organizationId,
      active_only: 'false',
    }),
  });
}

export function useOrgUnitTree(organizationId?: string) {
  return useQuery({
    queryKey: ['admin', 'orgUnitTree', organizationId],
    queryFn: () => tenantAdminApi.getOrgUnitTree({
      organization: organizationId,
      active_only: 'false',
    }),
  });
}

export function useCreateOrgUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OrgUnitWrite) => tenantAdminApi.createOrgUnit(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orgUnits'] });
      qc.invalidateQueries({ queryKey: ['admin', 'orgUnitTree'] });
    },
  });
}

export function useUpdateOrgUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OrgUnitWrite> }) =>
      tenantAdminApi.updateOrgUnit(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orgUnits'] });
      qc.invalidateQueries({ queryKey: ['admin', 'orgUnitTree'] });
    },
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export function useTenantUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => tenantAdminApi.listUsers({ active_only: 'false' }),
  });
}

export function useCreateTenantUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TenantUserCreate) => tenantAdminApi.createUser(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateTenantUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TenantUserUpdate }) =>
      tenantAdminApi.updateUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useSendAccessEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenantAdminApi.sendAccessEmail(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

// ── UserOrgAssignment ─────────────────────────────────────────────────────────

export function useOrgAssignments(userId?: string) {
  return useQuery({
    queryKey: ['admin', 'orgAssignments', userId],
    queryFn: () => tenantAdminApi.listOrgAssignments({ user: userId }),
  });
}

export function useCreateOrgAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UserOrgAssignmentWrite) => tenantAdminApi.createOrgAssignment(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'orgAssignments'] }),
  });
}

export function useDeleteOrgAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenantAdminApi.deleteOrgAssignment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'orgAssignments'] }),
  });
}

// ── UserRoleAssignment ────────────────────────────────────────────────────────

export function useRoleAssignments(userId?: string) {
  return useQuery({
    queryKey: ['admin', 'roleAssignments', userId],
    queryFn: () => tenantAdminApi.listRoleAssignments({ user: userId }),
  });
}

export function useCreateRoleAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UserRoleAssignmentWrite) => tenantAdminApi.createRoleAssignment(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'roleAssignments'] }),
  });
}

export function useDeleteRoleAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenantAdminApi.deleteRoleAssignment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'roleAssignments'] }),
  });
}

// ── Roles (read-only) ─────────────────────────────────────────────────────────

export function useRoles() {
  return useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => tenantAdminApi.listRoles(),
  });
}
