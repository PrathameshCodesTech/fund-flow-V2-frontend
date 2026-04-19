import { apiClient } from './client';
import type {
  BudgetPeriod,
  BudgetVersion,
  BudgetNode,
  BudgetVersionSummary,
} from '../types/budgets';

// ── Read APIs ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/budgets/periods/
 * Not paginated (BudgetScopeMixin sets pagination_class = None).
 */
export function listBudgetPeriods(params?: {
  organization?: string;
  fiscal_year?: number;
  status?: string;
}): Promise<BudgetPeriod[]> {
  return apiClient.get<BudgetPeriod[]>('/api/v1/budgets/periods/', params);
}

/**
 * GET /api/v1/budgets/versions/
 * Not paginated. Supports ?period= and ?organization= filters.
 */
export function listBudgetVersions(params?: {
  organization?: string;
  period?: string;
}): Promise<BudgetVersion[]> {
  return apiClient.get<BudgetVersion[]>('/api/v1/budgets/versions/', params);
}

/**
 * GET /api/v1/budgets/nodes/
 * Flat list of BudgetNodes. Not paginated.
 * Supports ?organization=, ?period=, ?version=, ?legal_entity=, ?org_unit= filters.
 */
export function listBudgetNodes(params?: {
  organization?: string;
  period?: string;
  version?: string;
  legal_entity?: string;
  org_unit?: string;
}): Promise<BudgetNode[]> {
  return apiClient.get<BudgetNode[]>('/api/v1/budgets/nodes/', params);
}

/**
 * GET /api/v1/budgets/nodes/tree/
 * Returns a nested tree of BudgetNodes. Not paginated.
 * Use ?version= to scope to a specific budget version.
 */
export function getBudgetTree(params?: {
  version?: string;
  period?: string;
  organization?: string;
  parent?: string;
}): Promise<BudgetNode[]> {
  return apiClient.get<BudgetNode[]>('/api/v1/budgets/nodes/tree/', params);
}

/**
 * GET /api/v1/budgets/versions/{id}/summary/
 * Returns totals and currency distribution for a budget version.
 * total_approved_amount is null when nodes use mixed currencies.
 */
export function getBudgetVersionSummary(versionId: string): Promise<BudgetVersionSummary> {
  return apiClient.get<BudgetVersionSummary>(`/api/v1/budgets/versions/${versionId}/summary/`);
}

/**
 * GET /api/v1/budgets/node-types/
 * List all budget node types.
 */
export function listBudgetNodeTypes(): Promise<any[]> {
  return apiClient.get<any[]>('/api/v1/budgets/node-types/');
}

// ── Create APIs ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/budgets/periods/
 * Create a new budget period.
 */
export function createBudgetPeriod(data: {
  organization_id: string;
  name: string;
  fiscal_year: number;
  period_type?: string;
  start_date: string;
  end_date: string;
  status?: string;
}): Promise<BudgetPeriod> {
  return apiClient.post<BudgetPeriod>('/api/v1/budgets/periods/', data);
}

/**
 * POST /api/v1/budgets/versions/
 * Create a new budget version.
 */
export function createBudgetVersion(data: {
  period_id: string;
  name: string;
  version_number: number;
  is_active?: boolean;
  notes?: string;
}): Promise<BudgetVersion> {
  return apiClient.post<BudgetVersion>('/api/v1/budgets/versions/', data);
}

/**
 * POST /api/v1/budgets/node-types/
 * Create a new budget node type.
 */
export function createBudgetNodeType(data: {
  code: string;
  name: string;
  level: number;
  is_active?: boolean;
}): Promise<any> {
  return apiClient.post<any>('/api/v1/budgets/node-types/', data);
}

/**
 * POST /api/v1/budgets/nodes/
 * Create a new budget node.
 */
export function createBudgetNode(data: {
  budget_version_id: string;
  node_type_id: string;
  parent_id?: string | null;
  code: string;
  name: string;
  description?: string;
  org_unit_id?: string | null;
  legal_entity_id?: string | null;
  cost_center_id?: string | null;
  approved_amount: number;
  currency?: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<BudgetNode> {
  return apiClient.post<BudgetNode>('/api/v1/budgets/nodes/', data);
}

// ── Update APIs ───────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/budgets/periods/{id}/
 * Update a budget period.
 */
export function updateBudgetPeriod(
  id: string,
  data: Partial<{
    organization_id: string;
    name: string;
    fiscal_year: number;
    period_type: string;
    start_date: string;
    end_date: string;
    status: string;
  }>,
): Promise<BudgetPeriod> {
  return apiClient.patch<BudgetPeriod>(`/api/v1/budgets/periods/${id}/`, data);
}

/**
 * PATCH /api/v1/budgets/versions/{id}/
 * Update a budget version.
 */
export function updateBudgetVersion(
  id: string,
  data: Partial<{
    period_id: string;
    name: string;
    version_number: number;
    is_active: boolean;
    notes: string;
  }>,
): Promise<BudgetVersion> {
  return apiClient.patch<BudgetVersion>(`/api/v1/budgets/versions/${id}/`, data);
}

/**
 * PATCH /api/v1/budgets/node-types/{id}/
 * Update a budget node type.
 */
export function updateBudgetNodeType(
  id: string,
  data: Partial<{
    code: string;
    name: string;
    level: number;
    is_active: boolean;
  }>,
): Promise<any> {
  return apiClient.patch<any>(`/api/v1/budgets/node-types/${id}/`, data);
}

/**
 * PATCH /api/v1/budgets/nodes/{id}/
 * Update a budget node.
 */
export function updateBudgetNode(
  id: string,
  data: Partial<{
    budget_version_id: string;
    node_type_id: string;
    parent_id: string | null;
    code: string;
    name: string;
    description: string;
    org_unit_id: string | null;
    legal_entity_id: string | null;
    cost_center_id: string | null;
    approved_amount: number;
    currency: string;
    sort_order: number;
    is_active: boolean;
  }>,
): Promise<BudgetNode> {
  return apiClient.patch<BudgetNode>(`/api/v1/budgets/nodes/${id}/`, data);
}

// ── Delete APIs ───────────────────────────────────────────────────────────

/**
 * DELETE /api/v1/budgets/periods/{id}/
 * Delete a budget period.
 */
export function deleteBudgetPeriod(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/v1/budgets/periods/${id}/`);
}

/**
 * DELETE /api/v1/budgets/versions/{id}/
 * Delete a budget version.
 */
export function deleteBudgetVersion(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/v1/budgets/versions/${id}/`);
}

/**
 * DELETE /api/v1/budgets/node-types/{id}/
 * Delete a budget node type.
 */
export function deleteBudgetNodeType(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/v1/budgets/node-types/${id}/`);
}

/**
 * DELETE /api/v1/budgets/nodes/{id}/
 * Delete a budget node.
 */
export function deleteBudgetNode(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/v1/budgets/nodes/${id}/`);
}
