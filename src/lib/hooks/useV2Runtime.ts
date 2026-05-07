import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listInstances,
  listMyTasks,
  createFromInvoice,
  activateInstance,
  approveStep,
  rejectStep,
  returnStepToVendor,
  reassignStep,
  approveBranch,
  rejectBranch,
  reassignBranch,
  getBranch,
  getAssignmentPlan,
  assignDraftStep,
  getTaskReview,
  getSplitOptions,
  submitSplit,
  getSingleAllocationOptions,
  submitSingleAllocation,
  listSplitOptions,
  createSplitOption,
  updateSplitOption,
  deleteSplitOption,
} from "../api/v2runtime";
import type {
  CreateFromInvoiceRequest,
  ApproveStepRequest,
  RejectStepRequest,
  ReturnToVendorStepRequest,
  ReassignStepRequest,
  ApproveBranchRequest,
  RejectBranchRequest,
  ReassignBranchRequest,
  AssignmentPlan,
  TaskKind,
  SubmitSplitRequest,
  SubmitSingleAllocationRequest,
} from "../types/v2runtime";

// ── Instances ────────────────────────────────────────────────────────────────

export function useInstances(params?: {
  subject_type?: string;
  subject_id?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["v2", "instances", params],
    queryFn: () => listInstances(params),
  });
}

// ── My Tasks ─────────────────────────────────────────────────────────────────

export function useTasks() {
  return useQuery({
    queryKey: ["v2", "tasks"],
    queryFn: () => listMyTasks(),
  });
}

// ── Create From Invoice ───────────────────────────────────────────────────────

export function useCreateFromInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFromInvoiceRequest) => createFromInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "instances"] });
    },
  });
}

// ── Activate Instance ────────────────────────────────────────────────────────

export function useActivateInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateInstance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "instances"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "tasks"] });
    },
  });
}

// ── Approve Step ─────────────────────────────────────────────────────────────

export function useApproveStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: { id: string; data?: ApproveStepRequest }) => approveStep(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "instances"] });
    },
  });
}

// ── Reject Step ──────────────────────────────────────────────────────────────

export function useRejectStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: { id: string; data?: RejectStepRequest }) => rejectStep(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "instances"] });
    },
  });
}

export function useReturnStepToVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: { id: string; data: ReturnToVendorStepRequest }) => returnStepToVendor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "instances"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "taskReview"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor-portal"] });
    },
  });
}

// ── Reassign Step ────────────────────────────────────────────────────────────

export function useReassignStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReassignStepRequest }) =>
      reassignStep(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "instances"] });
    },
  });
}

// ── Assignment Plan ────────────────────────────────────────────────────────────

export function useAssignmentPlan(instanceId: string | null) {
  return useQuery({
    queryKey: ["v2", "assignmentPlan", instanceId],
    queryFn: () => getAssignmentPlan(instanceId!),
    enabled: !!instanceId,
  });
}

export function useAssignDraftStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceStepId, userId }: { instanceStepId: string; userId: string }) =>
      assignDraftStep(instanceStepId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "assignmentPlan"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "instances"] });
    },
  });
}

// ── Approve Branch ────────────────────────────────────────────────────────────

export function useApproveBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ApproveBranchRequest }) =>
      approveBranch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "instances"] });
    },
  });
}

// ── Reject Branch ─────────────────────────────────────────────────────────────

export function useRejectBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: RejectBranchRequest }) =>
      rejectBranch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "instances"] });
    },
  });
}

// ── Reassign Branch ───────────────────────────────────────────────────────────

export function useReassignBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReassignBranchRequest }) =>
      reassignBranch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "instances"] });
    },
  });
}

// ── Get Branch ─────────────────────────────────────────────────────────────────

export function useBranch(id: string | null) {
  return useQuery({
    queryKey: ["v2", "branch", id],
    queryFn: () => getBranch(id!),
    enabled: !!id,
  });
}

// ── Task Review ───────────────────────────────────────────────────────────────

export function useTaskReview(taskKind: TaskKind | null, id: string | null) {
  return useQuery({
    queryKey: ["v2", "taskReview", taskKind, id],
    queryFn: () => getTaskReview(taskKind!, id!),
    enabled: !!(taskKind && id),
  });
}

// ── Runtime Split Allocation ──────────────────────────────────────────────────

export function useSplitOptions(instanceStepId: string | null) {
  return useQuery({
    queryKey: ["v2", "splitOptions", instanceStepId],
    queryFn: () => getSplitOptions(instanceStepId!),
    enabled: !!instanceStepId,
  });
}

export function useSubmitSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceStepId, data }: { instanceStepId: string; data: SubmitSplitRequest }) =>
      submitSplit(instanceStepId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "instances"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "splitOptions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "taskReview"] });
    },
  });
}

// ── Single Allocation ─────────────────────────────────────────────────────────

export function useSingleAllocationOptions(instanceStepId: string | null) {
  return useQuery({
    queryKey: ["v2", "singleAllocationOptions", instanceStepId],
    queryFn: () => getSingleAllocationOptions(instanceStepId!),
    enabled: !!instanceStepId,
  });
}

export function useSubmitSingleAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceStepId, data }: { instanceStepId: string; data: SubmitSingleAllocationRequest }) =>
      submitSingleAllocation(instanceStepId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "instances"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "singleAllocationOptions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "taskReview"] });
    },
  });
}

// ── Workflow Split Options CRUD ────────────────────────────────────────────────

export function useSplitOptionsAdmin(params?: { workflow_step?: string }) {
  return useQuery({
    queryKey: ["v2", "adminSplitOptions", params],
    queryFn: () => listSplitOptions(params),
  });
}

export function useCreateSplitOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createSplitOption>[0]) => createSplitOption(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "adminSplitOptions"] });
    },
  });
}

export function useUpdateSplitOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateSplitOption>[1] }) =>
      updateSplitOption(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "adminSplitOptions"] });
    },
  });
}

export function useDeleteSplitOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSplitOption(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "adminSplitOptions"] });
    },
  });
}
