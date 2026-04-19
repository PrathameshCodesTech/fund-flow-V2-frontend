import { apiClient } from "./client";
import type {
  Organization,
  ScopeNode,
  ScopeNodeTree,
  CreateScopeNodeRequest,
  PaginatedResponse,
} from "../types/core";

// ── Organizations ──────────────────────────────────────────────────────────────

export function listOrganizations(): Promise<PaginatedResponse<Organization>> {
  return apiClient.get<PaginatedResponse<Organization>>("/api/v1/core/organizations/");
}

// ── Scope Nodes ───────────────────────────────────────────────────────────────

export function listScopeNodes(params?: {
  org?: string;
}): Promise<PaginatedResponse<ScopeNode>> {
  return apiClient.get<PaginatedResponse<ScopeNode>>("/api/v1/core/nodes/", params);
}

export function getScopeNode(id: string): Promise<ScopeNode> {
  return apiClient.get<ScopeNode>(`/api/v1/core/nodes/${id}/`);
}

export function createScopeNode(
  data: CreateScopeNodeRequest,
): Promise<ScopeNode> {
  return apiClient.post<ScopeNode>("/api/v1/core/nodes/", data);
}

export function getScopeNodeTree(id: string): Promise<ScopeNodeTree> {
  return apiClient.get<ScopeNodeTree>(`/api/v1/core/nodes/${id}/tree/`);
}

export function getScopeNodeAncestors(id: string): Promise<ScopeNode[]> {
  return apiClient.get<ScopeNode[]>(`/api/v1/core/nodes/${id}/ancestors/`);
}

export function getScopeNodeSubtree(id: string): Promise<ScopeNode[]> {
  return apiClient.get<ScopeNode[]>(`/api/v1/core/nodes/${id}/subtree/`);
}
