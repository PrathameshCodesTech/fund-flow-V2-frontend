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
  SplitOptionsData,
  SubmitSplitRequest,
  SubmitSplitResult,
  SingleAllocationOptionsData,
  SubmitSingleAllocationRequest,
  SubmitSingleAllocationResult,
} from "../types/v2runtime";
import type { WorkflowSplitOption } from "../types/v2workflow";

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

// ── Runtime Split Allocation ──────────────────────────────────────────────────

export function getSplitOptions(instanceStepId: string): Promise<SplitOptionsData> {
  return apiClient.get<SplitOptionsData>(
    `/api/v1/workflow/instance-steps/${instanceStepId}/split-options/`,
  );
}

export function submitSplit(
  instanceStepId: string,
  data: SubmitSplitRequest,
): Promise<SubmitSplitResult> {
  return apiClient.post<SubmitSplitResult>(
    `/api/v1/workflow/instance-steps/${instanceStepId}/submit-split/`,
    data,
  );
}

export function getInvoiceAllocations(invoiceId: string): Promise<unknown[]> {
  return apiClient.get<unknown[]>(`/api/v1/invoices/${invoiceId}/allocations/`);
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

// ── Single Allocation ─────────────────────────────────────────────────────────

export function getSingleAllocationOptions(instanceStepId: string): Promise<SingleAllocationOptionsData> {
  return apiClient.get<SingleAllocationOptionsData>(
    `/api/v1/workflow/instance-steps/${instanceStepId}/single-allocation-options/`,
  );
}

export function submitSingleAllocation(
  instanceStepId: string,
  data: SubmitSingleAllocationRequest,
): Promise<SubmitSingleAllocationResult> {
  return apiClient.post<SubmitSingleAllocationResult>(
    `/api/v1/workflow/instance-steps/${instanceStepId}/submit-single-allocation/`,
    { allocation: data },
  );
}

// ── Workflow Split Options (admin config) ────────────────────────────────────

export function listSplitOptions(params?: {
  workflow_step?: string;
}): Promise<WorkflowSplitOption[]> {
  return apiClient.get<WorkflowSplitOption[]>("/api/v1/workflow/split-options/", params);
}

export function createSplitOption(data: {
  workflow_step: string;
  entity: number;
  approver_role?: number | null;
  allowed_approvers?: number[];
  category?: number | null;
  subcategory?: number | null;
  campaign?: number | null;
  budget?: number | null;
  is_active?: boolean;
  display_order?: number;
}): Promise<WorkflowSplitOption> {
  return apiClient.post<WorkflowSplitOption>("/api/v1/workflow/split-options/", data);
}

export function updateSplitOption(
  id: string,
  data: Partial<{
    approver_role: number | null;
    allowed_approvers: number[];
    category: number | null;
    subcategory: number | null;
    campaign: number | null;
    budget: number | null;
    is_active: boolean;
    display_order: number;
  }>,
): Promise<WorkflowSplitOption> {
  return apiClient.patch<WorkflowSplitOption>(`/api/v1/workflow/split-options/${id}/`, data);
}

export function deleteSplitOption(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/v1/workflow/split-options/${id}/`);
}
