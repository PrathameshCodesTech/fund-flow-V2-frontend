// ── Shared DRF pagination wrapper ────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── V2 Backend Types ────────────────────────────────────────────────────────────
// Reflects NewBackend/apps/core/api/serializers/__init__.py

export type NodeType =
  | "company"
  | "entity"
  | "region"
  | "branch"
  | "department"
  | "cost_center";

export interface Organization {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface ScopeNode {
  id: string;
  org: string;
  parent: string | null;
  name: string;
  code: string;
  node_type: NodeType;
  path: string;
  depth: number;
  is_active: boolean;
  created_at: string;
}

export interface ScopeNodeTree extends Omit<ScopeNode, "parent"> {
  children: ScopeNodeTree[];
}

// ── Request shapes ─────────────────────────────────────────────────────────────

export interface CreateScopeNodeRequest {
  org: string;
  parent?: string;
  name: string;
  code: string;
  node_type: NodeType;
}
