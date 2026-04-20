// ── V2 Budget Hooks ─────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  listSubCategories,
  getSubCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  listBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  listRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  listConsumptions,
  listVarianceRequests,
  getVarianceRequest,
  reviewVarianceRequest,
  getBudgetOverview,
} from "../api/v2budget";
import type {
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateSubCategoryRequest,
  UpdateSubCategoryRequest,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  CreateRuleRequest,
  UpdateRuleRequest,
  ReviewVarianceRequest,
} from "../types/v2budget";

// ── Categories ───────────────────────────────────────────────────────────────

export function useCategories(params?: { org?: string; is_active?: boolean }) {
  return useQuery({
    queryKey: ["v2", "budget", "categories", params],
    queryFn: async () => {
      const res = await listCategories(params);
      return res.results;
    },
  });
}

export function useCategory(id: string | null) {
  return useQuery({
    queryKey: ["v2", "budget", "category", id],
    queryFn: () => getCategory(id!),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryRequest) => createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "budget", "categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryRequest }) =>
      updateCategory(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "budget", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "budget", "category", id] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "budget", "categories"] });
    },
  });
}

// ── Subcategories ─────────────────────────────────────────────────────────────

export function useSubCategories(params?: { category?: string; is_active?: boolean }) {
  return useQuery({
    queryKey: ["v2", "budget", "subcategories", params],
    queryFn: async () => {
      const res = await listSubCategories(params);
      return res.results;
    },
  });
}

export function useSubCategory(id: string | null) {
  return useQuery({
    queryKey: ["v2", "budget", "subcategory", id],
    queryFn: () => getSubCategory(id!),
    enabled: !!id,
  });
}

export function useCreateSubCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSubCategoryRequest) => createSubCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["v2", "budget", "subcategories"],
      });
    },
  });
}

export function useUpdateSubCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubCategoryRequest }) =>
      updateSubCategory(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ["v2", "budget", "subcategories"],
      });
      queryClient.invalidateQueries({ queryKey: ["v2", "budget", "subcategory", id] });
    },
  });
}

export function useDeleteSubCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSubCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["v2", "budget", "subcategories"],
      });
    },
  });
}

// ── Budgets ──────────────────────────────────────────────────────────────────

export function useBudgets(params?: {
  org?: string;
  scope_node?: string;
  category?: string;
  subcategory?: string;
  financial_year?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["v2", "budget", "budgets", params],
    queryFn: async () => {
      const res = await listBudgets(params);
      return res.results;
    },
  });
}

export function useBudget(id: string | null) {
  return useQuery({
    queryKey: ["v2", "budget", "budget", id],
    queryFn: () => getBudget(id!),
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBudgetRequest) => createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "budget", "budgets"] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBudgetRequest }) =>
      updateBudget(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "budget", "budgets"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "budget", "budget", id] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "budget", "budgets"] });
    },
  });
}

// ── Rules ────────────────────────────────────────────────────────────────────

export function useRules(params?: { budget?: string; is_active?: boolean }) {
  return useQuery({
    queryKey: ["v2", "budget", "rules", params],
    queryFn: async () => {
      const res = await listRules(params);
      return res.results;
    },
  });
}

export function useRule(id: string | null) {
  return useQuery({
    queryKey: ["v2", "budget", "rule", id],
    queryFn: () => getRule(id!),
    enabled: !!id,
  });
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRuleRequest) => createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "budget", "rules"] });
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRuleRequest }) =>
      updateRule(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "budget", "rules"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "budget", "rule", id] });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "budget", "rules"] });
    },
  });
}

// ── Consumptions ─────────────────────────────────────────────────────────────

export function useConsumptions(params?: {
  budget?: string;
  source_type?: string;
  source_id?: string;
  consumption_type?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["v2", "budget", "consumptions", params],
    queryFn: async () => {
      const res = await listConsumptions(params);
      return res.results;
    },
  });
}

// ── Variance Requests ────────────────────────────────────────────────────────

export function useVarianceRequests(params?: { budget?: string; status?: string }) {
  return useQuery({
    queryKey: ["v2", "budget", "varianceRequests", params],
    queryFn: async () => {
      const res = await listVarianceRequests(params);
      return res.results;
    },
  });
}

export function useVarianceRequest(id: string | null) {
  return useQuery({
    queryKey: ["v2", "budget", "varianceRequest", id],
    queryFn: () => getVarianceRequest(id!),
    enabled: !!id,
  });
}

export function useReviewVarianceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ReviewVarianceRequest;
    }) => reviewVarianceRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["v2", "budget", "varianceRequests"],
      });
    },
  });
}

// ── Overview ──────────────────────────────────────────────────────────────────

export function useBudgetOverview() {
  return useQuery({
    queryKey: ["v2", "budget", "overview"],
    queryFn: getBudgetOverview,
    staleTime: 60_000,
  });
}