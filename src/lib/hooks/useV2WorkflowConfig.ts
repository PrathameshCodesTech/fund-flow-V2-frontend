import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  listVersions,
  createVersion,
  deleteVersion,
  publishVersion,
  archiveVersion,
  listStepGroups,
  createStepGroup,
  updateStepGroup,
  deleteStepGroup,
  listWorkflowSteps,
  createWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
} from "../api/v2workflowConfig";
import type {
  CreateTemplateRequest,
  CreateVersionRequest,
  CreateStepGroupRequest,
  CreateWorkflowStepRequest,
} from "../types/v2workflow";

// ── Templates ────────────────────────────────────────────────────────────────

export function useTemplates(params?: { scope_node?: string; module?: string }) {
  return useQuery({
    queryKey: ["v2", "workflowTemplates", params],
    queryFn: async () => {
      const res = await listTemplates(params);
      return res.results;
    },
  });
}

export function useTemplate(id: string | null) {
  return useQuery({
    queryKey: ["v2", "workflowTemplate", id],
    queryFn: () => getTemplate(id!),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateRequest) => createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowTemplates"] });
    },
  });
}

// ── Versions ────────────────────────────────────────────────────────────────

export function useVersions(params?: { template?: string }) {
  return useQuery({
    queryKey: ["v2", "workflowVersions", params],
    queryFn: async () => {
      const res = await listVersions(params);
      return res.results;
    },
  });
}

export function useCreateVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVersionRequest) => createVersion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowVersions"] });
    },
  });
}

export function usePublishVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishVersion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowVersions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowTemplate"] });
    },
  });
}

export function useArchiveVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveVersion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowVersions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowTemplate"] });
    },
  });
}

// ── Step Groups ────────────────────────────────────────────────────────────

export function useStepGroups(templateVersionId?: string) {
  return useQuery({
    queryKey: ["v2", "stepGroups", templateVersionId],
    queryFn: async () => {
      const res = await listStepGroups(
        templateVersionId ? { template_version: templateVersionId } : undefined,
      );
      return Array.isArray(res) ? res : res.results;
    },
    enabled: !!templateVersionId,
  });
}

export function useCreateStepGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStepGroupRequest) => createStepGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "stepGroups"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowVersions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowTemplate"] });
    },
  });
}

// ── Workflow Steps ────────────────────────────────────────────────────────

export function useWorkflowSteps(groupId?: string) {
  return useQuery({
    queryKey: ["v2", "workflowSteps", groupId],
    queryFn: async () => {
      const res = await listWorkflowSteps(groupId ? { group: groupId } : undefined);
      return Array.isArray(res) ? res : res.results;
    },
    enabled: !!groupId,
  });
}

// ── Templates ────────────────────────────────────────────────────────────────

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; module?: string; scope_node?: string } }) =>
      updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowTemplates"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowTemplate"] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowTemplates"] });
    },
  });
}

// ── Versions ────────────────────────────────────────────────────────────────

export function useDeleteVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVersion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowVersions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowTemplate"] });
    },
  });
}

// ── Step Groups ────────────────────────────────────────────────────────────

export function useUpdateStepGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateStepGroupRequest> }) =>
      updateStepGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "stepGroups"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowVersions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowTemplate"] });
    },
  });
}

export function useDeleteStepGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStepGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "stepGroups"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowVersions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowTemplate"] });
    },
  });
}

// ── Workflow Steps ─────────────────────────────────────────────────────────

export function useUpdateWorkflowStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateWorkflowStepRequest> }) =>
      updateWorkflowStep(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowSteps"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "stepGroups"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowVersions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowTemplate"] });
    },
  });
}

export function useDeleteWorkflowStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkflowStep(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowSteps"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "stepGroups"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowVersions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowTemplate"] });
    },
  });
}

export function useCreateWorkflowStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkflowStepRequest) => createWorkflowStep(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowSteps"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "stepGroups"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowVersions"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "workflowTemplate"] });
    },
  });
}
