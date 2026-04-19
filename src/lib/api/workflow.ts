import { apiClient } from './client';
import type {
  WorkflowTask,
  WorkflowInstance,
  WorkflowStepActionResult,
} from '../types/workflow';

// ── Source-of-truth notes ─────────────────────────────────────────────────────
//
// This module owns the WORKFLOW-STEP ACTION surface for invoice routing.
//
// Routing authority after invoice submit:
//   approveWorkflowStep  → POST /steps/<id>/approve/   → routes invoice forward
//   rejectWorkflowStep   → POST /steps/<id>/reject/    → routes invoice backward
//   reassignWorkflowStep → POST /steps/<id>/reassign/ → changes assignee, stays in same step
//
// ENTRY action (not in this file — see invoices.ts):
//   submitInvoice() → POST /invoices/<id>/submit/ → creates workflow instance
//   The submit action starts the workflow; workflow-step actions own all routing after that.
//
// invoice.status is SYNCED STATE (read-only display) — it reflects the workflow state
// but the workflow runtime is the authoritative routing engine.
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Correct path: /tasks/my/ (not /my-tasks/)
export async function getMyWorkflowTasks(params?: {
  status?: string;
}): Promise<WorkflowTask[]> {
  let page = 1;
  const all: WorkflowTask[] = [];
  while (true) {
    const res = await apiClient.get<PaginatedResponse<WorkflowTask>>(
      '/api/v1/workflow/tasks/my/',
      { ...params, page },
    );
    all.push(...res.results);
    if (!res.next) break;
    page++;
  }
  return all;
}

// Action payload field is "comment" (singular), not "comments"
export function approveWorkflowStep(
  stepId: string,
  comment?: string,
): Promise<WorkflowStepActionResult> {
  return apiClient.post<WorkflowStepActionResult>(
    `/api/v1/workflow/steps/${stepId}/approve/`,
    { comment: comment ?? '' },
  );
}

export function rejectWorkflowStep(
  stepId: string,
  comment?: string,
): Promise<WorkflowStepActionResult> {
  return apiClient.post<WorkflowStepActionResult>(
    `/api/v1/workflow/steps/${stepId}/reject/`,
    { comment: comment ?? '' },
  );
}

export function getWorkflowInstance(instanceId: string): Promise<WorkflowInstance> {
  return apiClient.get<WorkflowInstance>(`/api/v1/workflow/instances/${instanceId}/`);
}

// POST /api/v1/workflow/steps/<stepId>/reassign/
// Reassigns the step to a different approver. Actor must be staff or the current assignee.
export function reassignWorkflowStep(
  stepId: string,
  assignee: string,
  comment?: string,
): Promise<WorkflowStepActionResult> {
  return apiClient.post<WorkflowStepActionResult>(
    `/api/v1/workflow/steps/${stepId}/reassign/`,
    { assignee, comment: comment ?? '' },
  );
}
