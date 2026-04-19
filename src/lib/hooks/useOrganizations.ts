import { useQuery } from '@tanstack/react-query';
import { listLegalEntities, listOrganizations, listCostCenters } from '../api/organization';

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: listOrganizations,
  });
}

export function useLegalEntities(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['legalEntities', organizationId],
    queryFn: () => listLegalEntities({ organization: organizationId }),
    enabled: !!organizationId,
  });
}

export function useCostCenters(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['costCenters', organizationId],
    queryFn: () => listCostCenters({ organization: organizationId }),
    enabled: !!organizationId,
  });
}
