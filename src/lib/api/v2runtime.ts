import { apiClient } from "./client";
import type {
  WorkflowInstance,
  WorkflowTask,
  CreateFromInvoiceRequest,
  ApproveStepRequest,
  RejectStepRequest,
  ReassignStepRequest,
  ApproveBranchRequest,
  RejectBranchRequest,
  ReassignBranchRequest,
  AssignmentPlan,
  WorkflowInstanceStep,
  WorkflowInstanceBranch,
  TaskReviewData,
} from "../types/v2runtime";

// ── Instance List ─────────────────────────────────────────────────────────────

export function listInstances(params?: {
  subject_type?: string;
  subject_id?: string;
  status?: string;
}): Promise<WorkflowInstance[]> {
  return apiClient.get<WorkflowInstance[]>("/api/v1/workflow/instances/", params);
}

// ── Instance Detail ───────────────────────────────────────────────────────────

export function getInstance(id: string): Promise<WorkflowInstance> {
  return apiClient.get<WorkflowInstance>(`/api/v1/workflow/instances/${id}/`);
}

// ── Create From Invoice ───────────────────────────────────────────────────────

export function createFromInvoice(
  data: CreateFromInvoiceRequest,
): Promise<WorkflowInstance> {
  return apiClient.post<WorkflowInstance>(
    "/api/v1/workflow/instances/from-invoice/",
    data,
  );
}

// ── Activate Instance ────────────────────────────────────────────────────────

export function activateInstance(id: string): Promise<WorkflowInstance> {
  return apiClient.post<WorkflowInstance>(
    `/api/v1/workflow/instances/${id}/activate/`,
  );
}

// ── My Tasks ──────────────────────────────────────────────────────────────────

export function listMyTasks(): Promise<WorkflowTask[]> {
  return apiClient.get<WorkflowTask[]>("/api/v1/workflow/tasks/me/");
}

// ── Step Actions ─────────────────────────────────────────────────────────────

export function approveStep(
  id: string,
  data?: ApproveStepRequest,
): Promise<unknown> {
  return apiClient.post<unknown>(
    `/api/v1/workflow/instance-steps/${id}/approve/`,
    data ?? {},
  );
}

export function rejectStep(
  id: string,
  data?: RejectStepRequest,
): Promise<unknown> {
  return apiClient.post<unknown>(
    `/api/v1/workflow/instance-steps/${id}/reject/`,
    data ?? {},
  );
}

export function reassignStep(
  id: string,
  data: ReassignStepRequest,
): Promise<unknown> {
  return apiClient.post<unknown>(
    `/api/v1/workflow/instance-steps/${id}/reassign/`,
    data,
  );
}

// ── Branch Actions ────────────────────────────────────────────────────────────

export function approveBranch(
  id: string,
  data?: ApproveBranchRequest,
): Promise<unknown> {
  return apiClient.post<unknown>(
    `/api/v1/workflow/branches/${id}/approve/`,
    data ?? {},
  );
}

export function rejectBranch(
  id: string,
  data?: RejectBranchRequest,
): Promise<unknown> {
  return apiClient.post<unknown>(
    `/api/v1/workflow/branches/${id}/reject/`,
    data ?? {},
  );
}

export function reassignBranch(
  id: string,
  data: ReassignBranchRequest,
): Promise<unknown> {
  return apiClient.post<unknown>(
    `/api/v1/workflow/branches/${id}/reassign/`,
    data,
  );
}

export function getBranch(id: string): Promise<WorkflowInstanceBranch> {
  return apiClient.get<WorkflowInstanceBranch>(`/api/v1/workflow/branches/${id}/`);
}

// ── Task Review ───────────────────────────────────────────────────────────────

export function getTaskReview(taskKind: "step" | "branch", id: string): Promise<TaskReviewData> {
  return apiClient.get<TaskReviewData>(`/api/v1/workflow/tasks/${taskKind}/${id}/review/`);
}

// ── Assignment Plan ────────────────────────────────────────────────────────────

export function getAssignmentPlan(instanceId: string): Promise<AssignmentPlan> {
  return apiClient.get<AssignmentPlan>(
    `/api/v1/workflow/instances/${instanceId}/assignment-plan/`,
  );
}

// ── Draft Step Assignment ─────────────────────────────────────────────────────

export function assignDraftStep(
  instanceStepId: string,
  userId: string,
): Promise<WorkflowInstanceStep> {
  return apiClient.post<WorkflowInstanceStep>(
    `/api/v1/workflow/instance-steps/${instanceStepId}/assign/`,
    { user_id: userId },
  );
}
