import { apiClient } from './client';
import type { LegalEntitySummary, OrganizationSummary, CostCenter } from '../types/organization';

export function listOrganizations(): Promise<OrganizationSummary[]> {
  return apiClient.get<OrganizationSummary[]>('/api/v1/org/organizations/');
}

export function listLegalEntities(params?: {
  organization?: string;
}): Promise<LegalEntitySummary[]> {
  return apiClient.get<LegalEntitySummary[]>('/api/v1/org/legal-entities/', params);
}

export function listCostCenters(params?: {
  organization?: string;
}): Promise<CostCenter[]> {
  return apiClient.get<CostCenter[]>('/api/v1/org/cost-centers/', params);
}
