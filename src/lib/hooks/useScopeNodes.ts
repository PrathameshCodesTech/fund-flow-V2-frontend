import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listOrganizations,
  listScopeNodes,
  getScopeNode,
  createScopeNode,
  getScopeNodeTree,
  getScopeNodeAncestors,
  getScopeNodeSubtree,
} from "../api/core";
import type { CreateScopeNodeRequest } from "../types/core";

// ── Queries ───────────────────────────────────────────────────────────────────

export function useOrganizations() {
  return useQuery({
    queryKey: ["v2", "organizations"],
    queryFn: async () => {
      const res = await listOrganizations();
      return res.results;
    },
  });
}

export function useScopeNodes(orgId?: string) {
  return useQuery({
    queryKey: ["v2", "scopeNodes", orgId],
    queryFn: async () => {
      const res = await listScopeNodes(orgId ? { org: orgId } : undefined);
      return res.results;
    },
  });
}

export function useScopeNode(id: string | null) {
  return useQuery({
    queryKey: ["v2", "scopeNode", id],
    queryFn: () => getScopeNode(id!),
    enabled: !!id,
  });
}

export function useScopeNodeTree(id: string | null) {
  return useQuery({
    queryKey: ["v2", "scopeNodeTree", id],
    queryFn: () => getScopeNodeTree(id!),
    enabled: !!id,
  });
}

export function useScopeNodeAncestors(id: string | null) {
  return useQuery({
    queryKey: ["v2", "scopeNodeAncestors", id],
    queryFn: () => getScopeNodeAncestors(id!),
    enabled: !!id,
  });
}

export function useScopeNodeSubtree(id: string | null) {
  return useQuery({
    queryKey: ["v2", "scopeNodeSubtree", id],
    queryFn: () => getScopeNodeSubtree(id!),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateScopeNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScopeNodeRequest) => createScopeNode(data),
    onSuccess: (_newNode, _vars, _ctx) => {
      // Invalidate all node queries — we don't know which org the node belongs to
      queryClient.invalidateQueries({ queryKey: ["v2", "scopeNodes"] });
    },
  });
}
