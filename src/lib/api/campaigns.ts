import { apiClient } from './client';
import type {
  Campaign,
  CampaignDetail,
  CampaignBudgetLink,
  CampaignWritePayload,
  CampaignBudgetLinkWritePayload,
} from '../types/campaigns';

/**
 * GET /api/v1/campaigns/
 * Returns a plain Campaign[] array.
 */
export async function listCampaigns(params?: {
  status?: string;
  organization?: string;
}): Promise<Campaign[]> {
  return apiClient.get<Campaign[]>('/api/v1/campaigns/', params);
}

/**
 * GET /api/v1/campaigns/{id}/
 * Returns CampaignDetailSerializer (includes scopes and budget_links).
 */
export function getCampaign(id: string): Promise<CampaignDetail> {
  return apiClient.get<CampaignDetail>(`/api/v1/campaigns/${id}/`);
}

/**
 * POST /api/v1/campaigns/
 * Requires IsAdminUser. Returns CampaignDetailSerializer on success.
 */
export function createCampaign(data: CampaignWritePayload): Promise<CampaignDetail> {
  return apiClient.post<CampaignDetail>('/api/v1/campaigns/', data);
}

/**
 * PATCH /api/v1/campaigns/{id}/
 * Requires IsAdminUser. Returns CampaignDetailSerializer on success.
 */
export function updateCampaign(
  id: string,
  data: Partial<CampaignWritePayload>,
): Promise<CampaignDetail> {
  return apiClient.patch<CampaignDetail>(`/api/v1/campaigns/${id}/`, data);
}

// ── Budget Links ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/campaigns/{id}/budget-links/
 * Returns a plain CampaignBudgetLink[] array.
 */
export function listCampaignBudgetLinks(campaignId: string): Promise<CampaignBudgetLink[]> {
  return apiClient.get<CampaignBudgetLink[]>(
    `/api/v1/campaigns/${campaignId}/budget-links/`,
  );
}

/**
 * POST /api/v1/campaigns/{id}/budget-links/
 * Requires IsAdminUser.
 */
export function createCampaignBudgetLink(
  campaignId: string,
  data: CampaignBudgetLinkWritePayload,
): Promise<CampaignBudgetLink> {
  return apiClient.post<CampaignBudgetLink>(
    `/api/v1/campaigns/${campaignId}/budget-links/`,
    data,
  );
}

/**
 * PATCH /api/v1/campaigns/budget-links/{id}/
 * Requires campaign.manage capability.
 */
export function updateCampaignBudgetLink(
  linkId: string,
  data: Partial<CampaignBudgetLinkWritePayload>,
): Promise<CampaignBudgetLink> {
  return apiClient.patch<CampaignBudgetLink>(
    `/api/v1/campaigns/budget-links/${linkId}/`,
    data,
  );
}

/**
 * DELETE /api/v1/campaigns/budget-links/{id}/
 * Requires campaign.manage capability.
 */
export function deleteCampaignBudgetLink(linkId: string): Promise<void> {
  return apiClient.delete<void>(`/api/v1/campaigns/budget-links/${linkId}/`);
}
