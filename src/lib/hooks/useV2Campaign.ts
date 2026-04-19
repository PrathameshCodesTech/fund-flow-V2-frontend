// ── V2 Campaign Hooks ─────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  submitBudget,
  reviewBudgetVariance,
  cancelCampaign,
  listCampaignDocuments,
  createCampaignDocument,
  deleteCampaignDocument,
  createWorkflowFromCampaign,
} from "../api/v2campaign";
import type {
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CreateCampaignDocumentRequest,
  ReviewBudgetVarianceRequest,
  CancelCampaignRequest,
  CreateWorkflowFromCampaignRequest,
} from "../types/v2campaign";

// ── Campaigns ─────────────────────────────────────────────────────────────────

export function useCampaigns(params?: {
  org?: string;
  scope_node?: string;
  status?: string;
  category?: string;
  subcategory?: string;
  budget?: string;
}) {
  return useQuery({
    queryKey: ["v2", "campaigns", params],
    queryFn: async () => {
      const res = await listCampaigns(params);
      return res.results;
    },
  });
}

export function useCampaign(id: string | null) {
  return useQuery({
    queryKey: ["v2", "campaign", id],
    queryFn: () => getCampaign(id!),
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCampaignRequest) => createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "campaigns"] });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCampaignRequest }) =>
      updateCampaign(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "campaign", id] });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "campaigns"] });
    },
  });
}

// ── Submit budget ─────────────────────────────────────────────────────────────

export function useSubmitBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitBudget(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "campaign", id] });
    },
  });
}

// ── Review budget variance ─────────────────────────────────────────────────────

export function useReviewBudgetVariance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewBudgetVarianceRequest }) =>
      reviewBudgetVariance(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "campaign", id] });
    },
  });
}

// ── Cancel campaign ───────────────────────────────────────────────────────────

export function useCancelCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: CancelCampaignRequest }) =>
      cancelCampaign(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "campaign", id] });
    },
  });
}

// ── Campaign documents ────────────────────────────────────────────────────────

export function useCampaignDocuments(params?: { campaign?: string }) {
  return useQuery({
    queryKey: ["v2", "campaignDocuments", params],
    queryFn: async () => {
      const res = await listCampaignDocuments(params);
      return res.results;
    },
  });
}

export function useCreateCampaignDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCampaignDocumentRequest) =>
      createCampaignDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["v2", "campaignDocuments"],
      });
    },
  });
}

export function useDeleteCampaignDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCampaignDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["v2", "campaignDocuments"],
      });
    },
  });
}

// ── Create workflow from campaign ─────────────────────────────────────────────

export function useCreateWorkflowFromCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkflowFromCampaignRequest) =>
      createWorkflowFromCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "instances"] });
    },
  });
}