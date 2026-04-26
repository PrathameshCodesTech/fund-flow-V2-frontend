// ── Manual Expenses API ──────────────────────────────────────────────────────

import { apiClient } from './client';
import type {
  ManualExpenseEntry,
  ManualExpenseAttachment,
  ManualExpenseListItem,
  CreateExpenseRequest,
  UpdateExpenseRequest,
} from '../types/manual-expenses';

// ── List / Retrieve ──────────────────────────────────────────────────────────

export async function listExpenses(params?: {
  status?: string;
  payment_method?: string;
  scope_node?: string;
  budget?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
}): Promise<{ count: number; next: string | null; previous: string | null; results: ManualExpenseListItem[] }> {
  return apiClient.get('/api/v1/manual-expenses/expenses/', params);
}

export async function getExpense(id: string): Promise<ManualExpenseEntry> {
  return apiClient.get<ManualExpenseEntry>(`/api/v1/manual-expenses/expenses/${id}/`);
}

// ── Create / Update ──────────────────────────────────────────────────────────

export async function createExpense(
  data: CreateExpenseRequest,
): Promise<ManualExpenseEntry> {
  return apiClient.post<ManualExpenseEntry>('/api/v1/manual-expenses/expenses/', data);
}

export async function updateExpense(
  id: string,
  data: UpdateExpenseRequest,
): Promise<ManualExpenseEntry> {
  return apiClient.patch<ManualExpenseEntry>(`/api/v1/manual-expenses/expenses/${id}/`, data);
}

// ── State transitions ────────────────────────────────────────────────────────

export async function submitExpense(id: string): Promise<ManualExpenseEntry> {
  return apiClient.post<ManualExpenseEntry>(`/api/v1/manual-expenses/expenses/${id}/submit/`);
}

export async function settleExpense(id: string): Promise<ManualExpenseEntry> {
  return apiClient.post<ManualExpenseEntry>(`/api/v1/manual-expenses/expenses/${id}/settle/`);
}

export async function cancelExpense(id: string, note?: string): Promise<ManualExpenseEntry> {
  return apiClient.post<ManualExpenseEntry>(`/api/v1/manual-expenses/expenses/${id}/cancel/`, note ? { note } : {});
}

// ── Attachments ─────────────────────────────────────────────────────────────

export async function uploadExpenseAttachment(
  expenseId: string,
  file: File,
  title: string,
  documentType?: string,
): Promise<ManualExpenseAttachment> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('title', title);
  fd.append('expense_entry', expenseId);
  if (documentType) fd.append('document_type', documentType);
  return apiClient.multipart<ManualExpenseAttachment>(
    '/api/v1/manual-expenses/expense-attachments/',
    fd,
  );
}

export async function deleteExpenseAttachment(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/manual-expenses/expense-attachments/${id}/`);
}

// ── Budget / Category lookups ─────────────────────────────────────────────────

export async function listBudgetsForScope(scopeNodeId: string): Promise<unknown[]> {
  return apiClient.get('/api/v1/budgets/', { scope_node: scopeNodeId, status: 'active' });
}

export async function listCategoriesForOrg(orgId: string): Promise<unknown[]> {
  return apiClient.get('/api/v1/budgets/categories/', { org: orgId });
}

export async function listSubcategoriesForCategory(categoryId: string): Promise<unknown[]> {
  return apiClient.get(`/api/v1/budgets/categories/${categoryId}/subcategories/`);
}