import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  listCampaignBudgetLinks,
  createCampaignBudgetLink,
  updateCampaignBudgetLink,
  deleteCampaignBudgetLink,
} from '../api/campaigns';
import type { CampaignWritePayload, CampaignBudgetLinkWritePayload } from '../types/campaigns';

export function useCampaigns(params?: { status?: string; organization?: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['campaigns', params],
    queryFn: () => listCampaigns(params),
  });
  return {
    campaigns: data ?? [],
    total: data?.length ?? 0,
    isLoading,
    error,
  };
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => getCampaign(id!),
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (data: CampaignWritePayload) => createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
  return { createCampaign: mutateAsync, isCreating: isPending, createError: error };
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CampaignWritePayload> }) =>
      updateCampaign(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
    },
  });
  return { updateCampaign: mutateAsync, isUpdating: isPending, updateError: error };
}

export function useCampaignBudgetLinks(campaignId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['campaignBudgetLinks', campaignId],
    queryFn: () => listCampaignBudgetLinks(campaignId!),
    enabled: !!campaignId,
  });
  return {
    budgetLinks: data ?? [],
    isLoading,
    error,
  };
}

export function useCreateCampaignBudgetLink(campaignId: string | undefined) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (data: CampaignBudgetLinkWritePayload) =>
      createCampaignBudgetLink(campaignId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignBudgetLinks', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
  return { createLink: mutateAsync, isCreating: isPending, createError: error };
}

export function useUpdateCampaignBudgetLink() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: ({
      linkId,
      data,
    }: {
      linkId: string;
      data: Partial<CampaignBudgetLinkWritePayload>;
    }) => updateCampaignBudgetLink(linkId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignBudgetLinks'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
  return { updateLink: mutateAsync, isUpdating: isPending, updateError: error };
}

export function useDeleteCampaignBudgetLink() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: ({ linkId, campaignId }: { linkId: string; campaignId: string }) =>
      deleteCampaignBudgetLink(linkId),
    onSuccess: (_result, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaignBudgetLinks', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
  return { deleteLink: mutateAsync, isDeleting: isPending, deleteError: error };
}
