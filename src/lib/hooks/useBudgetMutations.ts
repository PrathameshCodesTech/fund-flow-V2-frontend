import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createBudgetPeriod,
  createBudgetVersion,
  createBudgetNodeType,
  createBudgetNode,
  updateBudgetPeriod,
  updateBudgetVersion,
  updateBudgetNodeType,
  updateBudgetNode,
  deleteBudgetPeriod,
  deleteBudgetVersion,
  deleteBudgetNodeType,
  deleteBudgetNode,
} from '../api/budgets';
import type { BudgetPeriod, BudgetVersion, BudgetNode } from '../types/budgets';

/**
 * Mutation hook for creating a budget period.
 */
export function useCreateBudgetPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBudgetPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetPeriods'] });
    },
  });
}

/**
 * Mutation hook for updating a budget period.
 */
export function useUpdateBudgetPeriod(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateBudgetPeriod>[1]) =>
      updateBudgetPeriod(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetPeriods'] });
    },
  });
}

/**
 * Mutation hook for deleting a budget period.
 */
export function useDeleteBudgetPeriod(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteBudgetPeriod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetPeriods'] });
    },
  });
}

/**
 * Mutation hook for creating a budget version.
 */
export function useCreateBudgetVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBudgetVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetVersions'] });
    },
  });
}

/**
 * Mutation hook for updating a budget version.
 */
export function useUpdateBudgetVersion(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateBudgetVersion>[1]) =>
      updateBudgetVersion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetVersions'] });
      queryClient.invalidateQueries({ queryKey: ['budgetVersionSummary'] });
    },
  });
}

/**
 * Mutation hook for deleting a budget version.
 */
export function useDeleteBudgetVersion(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteBudgetVersion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetVersions'] });
    },
  });
}

/**
 * Mutation hook for creating a budget node type.
 */
export function useCreateBudgetNodeType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBudgetNodeType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetNodeTypes'] });
    },
  });
}

/**
 * Mutation hook for updating a budget node type.
 */
export function useUpdateBudgetNodeType(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateBudgetNodeType>[1]) =>
      updateBudgetNodeType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetNodeTypes'] });
    },
  });
}

/**
 * Mutation hook for deleting a budget node type.
 */
export function useDeleteBudgetNodeType(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteBudgetNodeType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetNodeTypes'] });
    },
  });
}

/**
 * Mutation hook for creating a budget node.
 */
export function useCreateBudgetNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBudgetNode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetNodes'] });
      queryClient.invalidateQueries({ queryKey: ['budgetTree'] });
      queryClient.invalidateQueries({ queryKey: ['budgetVersionSummary'] });
    },
  });
}

/**
 * Mutation hook for updating a budget node.
 */
export function useUpdateBudgetNode(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateBudgetNode>[1]) =>
      updateBudgetNode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetNodes'] });
      queryClient.invalidateQueries({ queryKey: ['budgetTree'] });
      queryClient.invalidateQueries({ queryKey: ['budgetVersionSummary'] });
    },
  });
}

/**
 * Mutation hook for deleting a budget node.
 */
export function useDeleteBudgetNode(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteBudgetNode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetNodes'] });
      queryClient.invalidateQueries({ queryKey: ['budgetTree'] });
      queryClient.invalidateQueries({ queryKey: ['budgetVersionSummary'] });
    },
  });
}
