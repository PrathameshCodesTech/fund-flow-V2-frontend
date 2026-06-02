import { apiClient } from "./client";
import type {
  FinanceHandoff,
  FinanceHandoffListResponse,
  FinanceHandoffFilters,
  PublicFinanceToken,
  FinanceApproveRequest,
  FinanceRejectRequest,
  FinanceHandoffResponse,
} from "../types/v2finance";

// ── Finance Handoff List ──────────────────────────────────────────────────────

export function listFinanceHandoffs(
  params?: FinanceHandoffFilters,
): Promise<FinanceHandoffListResponse> {
  return apiClient.get<FinanceHandoffListResponse>("/api/v1/finance/handoffs/", params);
}

// ── Finance Handoff Detail ────────────────────────────────────────────────────

export function getFinanceHandoff(id: string): Promise<FinanceHandoff> {
  return apiClient.get<FinanceHandoff>(`/api/v1/finance/handoffs/${id}/`);
}

export function resendFinanceHandoff(id: string): Promise<FinanceHandoff> {
  return apiClient.post<FinanceHandoff>(`/api/v1/finance/handoffs/${id}/send/`, {});
}

export function getPublicFinanceToken(token: string): Promise<PublicFinanceToken> {
  return apiClient.get<PublicFinanceToken>(`/api/v1/finance/public/${token}/`);
}

export function financeApprove(
  token: string,
  data: FinanceApproveRequest,
): Promise<{ handoff: FinanceHandoff }> {
  return apiClient.post<{ handoff: FinanceHandoff }>(`/api/v1/finance/public/${token}/approve/`, data);
}

export function financeReject(
  token: string,
  data: FinanceRejectRequest,
): Promise<{ handoff: FinanceHandoff }> {
  return apiClient.post<{ handoff: FinanceHandoff }>(`/api/v1/finance/public/${token}/reject/`, data);
}

// ── Authenticated Finance Handoff Endpoints ─────────────────────────────────────

/** Get review data for a finance handoff (authenticated, no token required) */
export function getFinanceHandoffReview(id: string): Promise<PublicFinanceToken> {
  return apiClient.get<PublicFinanceToken>(`/api/v1/finance/handoffs/${id}/review/`);
}

/** Approve a finance handoff (authenticated, no token required) */
export function approveFinanceHandoff(
  id: string,
  data: FinanceApproveRequest,
): Promise<FinanceHandoffResponse> {
  return apiClient.post<FinanceHandoffResponse>(`/api/v1/finance/handoffs/${id}/approve/`, data);
}

/** Reject a finance handoff (authenticated, no token required) */
export function rejectFinanceHandoff(
  id: string,
  data: FinanceRejectRequest,
): Promise<FinanceHandoffResponse> {
  return apiClient.post<FinanceHandoffResponse>(`/api/v1/finance/handoffs/${id}/reject/`, data);
}
