// ── V2 Budget API ─────────────────────────────────────────────────────────────────
// Base path: /api/v1/budgets/

import { apiClient } from "./client";
import type {
  BudgetCategory,
  BudgetSubCategory,
  Budget,
  BudgetLine,
  BudgetRule,
  BudgetConsumption,
  BudgetVarianceRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateSubCategoryRequest,
  UpdateSubCategoryRequest,
  CreateBudgetLineRequest,
  UpdateBudgetLineRequest,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  ReserveBudgetLineRequest,
  ConsumeBudgetLineRequest,
  ReleaseBudgetLineRequest,
  ReserveBudgetLineResponse,
  ConsumeBudgetLineResponse,
  ReleaseBudgetLineResponse,
  CreateRuleRequest,
  UpdateRuleRequest,
  ReviewVarianceRequest,
  CategoryListResponse,
  SubCategoryListResponse,
  BudgetListResponse,
  BudgetLineListResponse,
  RuleListResponse,
  ConsumptionListResponse,
  VarianceRequestListResponse,
  BudgetOverviewPayload,
} from "../types/v2budget";

// ── Categories ───────────────────────────────────────────────────────────────

export async function listCategories(params?: {
  org?: string;
  is_active?: boolean;
}): Promise<CategoryListResponse> {
  return apiClient.get("/api/v1/budgets/categories/", params);
}

export async function getCategory(id: string): Promise<BudgetCategory> {
  return apiClient.get(`/api/v1/budgets/categories/${id}/`);
}

export async function createCategory(
  data: CreateCategoryRequest,
): Promise<BudgetCategory> {
  return apiClient.post("/api/v1/budgets/categories/", data);
}

export async function updateCategory(
  id: string,
  data: UpdateCategoryRequest,
): Promise<BudgetCategory> {
  return apiClient.patch(`/api/v1/budgets/categories/${id}/`, data);
}

export async function deleteCategory(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/budgets/categories/${id}/`);
}

// ── Subcategories ─────────────────────────────────────────────────────────────

export async function listSubCategories(params?: {
  category?: string;
  is_active?: boolean;
}): Promise<SubCategoryListResponse> {
  return apiClient.get("/api/v1/budgets/subcategories/", params);
}

export async function getSubCategory(id: string): Promise<BudgetSubCategory> {
  return apiClient.get(`/api/v1/budgets/subcategories/${id}/`);
}

export async function createSubCategory(
  data: CreateSubCategoryRequest,
): Promise<BudgetSubCategory> {
  return apiClient.post("/api/v1/budgets/subcategories/", data);
}

export async function updateSubCategory(
  id: string,
  data: UpdateSubCategoryRequest,
): Promise<BudgetSubCategory> {
  return apiClient.patch(`/api/v1/budgets/subcategories/${id}/`, data);
}

export async function deleteSubCategory(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/budgets/subcategories/${id}/`);
}

// ── Budgets ──────────────────────────────────────────────────────────────────

export async function listBudgets(params?: {
  org?: string;
  scope_node?: string;
  financial_year?: string;
  status?: string;
}): Promise<BudgetListResponse> {
  return apiClient.get("/api/v1/budgets/", params);
}

export async function getBudget(id: string): Promise<Budget> {
  return apiClient.get(`/api/v1/budgets/${id}/`);
}

export async function createBudget(
  data: CreateBudgetRequest,
): Promise<Budget> {
  return apiClient.post("/api/v1/budgets/", data);
}

export async function updateBudget(
  id: string,
  data: UpdateBudgetRequest,
): Promise<Budget> {
  return apiClient.patch(`/api/v1/budgets/${id}/`, data);
}

export async function deleteBudget(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/budgets/${id}/`);
}

// ── BudgetLines (standalone CRUD) ─────────────────────────────────────────────

export async function listBudgetLines(params?: {
  budget?: string;
  category?: string;
}): Promise<BudgetLineListResponse> {
  return apiClient.get("/api/v1/budgets/lines/", params);
}

export async function getBudgetLine(id: string): Promise<BudgetLine> {
  return apiClient.get(`/api/v1/budgets/lines/${id}/`);
}

export async function createBudgetLine(
  data: CreateBudgetLineRequest & { budget: string },
): Promise<BudgetLine> {
  return apiClient.post("/api/v1/budgets/lines/", data);
}

export async function updateBudgetLine(
  id: string,
  data: UpdateBudgetLineRequest,
): Promise<BudgetLine> {
  return apiClient.patch(`/api/v1/budgets/lines/${id}/`, data);
}

export async function deleteBudgetLine(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/budgets/lines/${id}/`);
}

// ── Runtime: Reserve / Consume / Release ─────────────────────────────────────

export async function reserveBudgetLine(
  budgetId: string,
  data: ReserveBudgetLineRequest,
): Promise<ReserveBudgetLineResponse> {
  return apiClient.post(`/api/v1/budgets/${budgetId}/reserve/`, data);
}

export async function consumeBudgetLine(
  budgetId: string,
  data: ConsumeBudgetLineRequest,
): Promise<ConsumeBudgetLineResponse> {
  return apiClient.post(`/api/v1/budgets/${budgetId}/consume/`, data);
}

export async function releaseBudgetLine(
  budgetId: string,
  data: ReleaseBudgetLineRequest,
): Promise<ReleaseBudgetLineResponse> {
  return apiClient.post(`/api/v1/budgets/${budgetId}/release/`, data);
}

// ── Rules ────────────────────────────────────────────────────────────────────

export async function listRules(params?: {
  budget?: string;
  is_active?: boolean;
}): Promise<RuleListResponse> {
  return apiClient.get("/api/v1/budgets/rules/", params);
}

export async function getRule(id: string): Promise<BudgetRule> {
  return apiClient.get(`/api/v1/budgets/rules/${id}/`);
}

export async function createRule(data: CreateRuleRequest): Promise<BudgetRule> {
  return apiClient.post("/api/v1/budgets/rules/", data);
}

export async function updateRule(
  id: string,
  data: UpdateRuleRequest,
): Promise<BudgetRule> {
  return apiClient.patch(`/api/v1/budgets/rules/${id}/`, data);
}

export async function deleteRule(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/budgets/rules/${id}/`);
}

// ── Consumptions ─────────────────────────────────────────────────────────────

export async function listConsumptions(params?: {
  budget?: string;
  budget_line?: string;
  source_type?: string;
  source_id?: string;
  consumption_type?: string;
  status?: string;
}): Promise<ConsumptionListResponse> {
  return apiClient.get("/api/v1/budgets/consumptions/", params);
}

// ── Variance Requests ────────────────────────────────────────────────────────

export async function listVarianceRequests(params?: {
  budget?: string;
  status?: string;
}): Promise<VarianceRequestListResponse> {
  return apiClient.get("/api/v1/budgets/variance-requests/", params);
}

export async function getVarianceRequest(
  id: string,
): Promise<BudgetVarianceRequest> {
  return apiClient.get(`/api/v1/budgets/variance-requests/${id}/`);
}

export async function reviewVarianceRequest(
  id: string,
  data: ReviewVarianceRequest,
): Promise<BudgetVarianceRequest> {
  return apiClient.post(
    `/api/v1/budgets/variance-requests/${id}/review/`,
    data,
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

export async function getBudgetOverview(): Promise<BudgetOverviewPayload> {
  return apiClient.get("/api/v1/budgets/overview/");
}
