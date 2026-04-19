// ── V2 Campaign API ─────────────────────────────────────────────────────────────────
// Base path: /api/v1/campaigns/

import { apiClient } from "./client";
import type {
  Campaign,
  CampaignDocument,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CreateCampaignDocumentRequest,
  SubmitBudgetResponse,
  ReviewBudgetVarianceRequest,
  CancelCampaignRequest,
  CreateWorkflowFromCampaignRequest,
  CampaignListResponse,
  CampaignDocumentListResponse,
} from "../types/v2campaign";

// ── Campaigns ─────────────────────────────────────────────────────────────────

export async function listCampaigns(params?: {
  org?: string;
  scope_node?: string;
  status?: string;
  category?: string;
  subcategory?: string;
  budget?: string;
}): Promise<CampaignListResponse> {
  return apiClient.get("/api/v1/campaigns/", params);
}

export async function getCampaign(id: string): Promise<Campaign> {
  return apiClient.get(`/api/v1/campaigns/${id}/`);
}

export async function createCampaign(
  data: CreateCampaignRequest,
): Promise<Campaign> {
  return apiClient.post("/api/v1/campaigns/", data);
}

export async function updateCampaign(
  id: string,
  data: UpdateCampaignRequest,
): Promise<Campaign> {
  return apiClient.patch(`/api/v1/campaigns/${id}/`, data);
}

export async function deleteCampaign(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/campaigns/${id}/`);
}

// ── Campaign actions ──────────────────────────────────────────────────────────

export async function submitBudget(
  id: string,
): Promise<SubmitBudgetResponse> {
  return apiClient.post(`/api/v1/campaigns/${id}/submit-budget/`);
}

export async function reviewBudgetVariance(
  id: string,
  data: ReviewBudgetVarianceRequest,
): Promise<Campaign> {
  return apiClient.post(
    `/api/v1/campaigns/${id}/review-budget-variance/`,
    data,
  );
}

export async function cancelCampaign(
  id: string,
  data?: CancelCampaignRequest,
): Promise<Campaign> {
  return apiClient.post(`/api/v1/campaigns/${id}/cancel/`, data ?? {});
}

// ── Campaign documents ────────────────────────────────────────────────────────

export async function listCampaignDocuments(params?: {
  campaign?: string;
}): Promise<CampaignDocumentListResponse> {
  return apiClient.get("/api/v1/campaigns/documents/", params);
}

export async function createCampaignDocument(
  data: CreateCampaignDocumentRequest,
): Promise<CampaignDocument> {
  return apiClient.post("/api/v1/campaigns/documents/", data);
}

export async function deleteCampaignDocument(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/campaigns/documents/${id}/`);
}

// ── Workflow from campaign ─────────────────────────────────────────────────────

export async function createWorkflowFromCampaign(
  data: CreateWorkflowFromCampaignRequest,
): Promise<unknown> {
  return apiClient.post("/api/v1/workflow/instances/from-campaign/", data);
}