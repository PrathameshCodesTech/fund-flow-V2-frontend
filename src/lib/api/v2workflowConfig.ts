import { apiClient } from "./client";
import type {
  WorkflowTemplate,
  WorkflowTemplateVersion,
  StepGroup,
  WorkflowStep,
  CreateTemplateRequest,
  CreateVersionRequest,
  CreateStepGroupRequest,
  CreateWorkflowStepRequest,
} from "../types/v2workflow";
import type { PaginatedResponse } from "../types/core";

// ── Templates ──────────────────────────────────────────────────────────────────

export function listTemplates(params?: {
  scope_node?: string;
  module?: string;
}): Promise<PaginatedResponse<WorkflowTemplate>> {
  return apiClient.get<PaginatedResponse<WorkflowTemplate>>(
    "/api/v1/workflow/templates/",
    params,
  );
}

export function getTemplate(id: string): Promise<WorkflowTemplate> {
  return apiClient.get<WorkflowTemplate>(
    `/api/v1/workflow/templates/${id}/`,
  );
}

export function createTemplate(data: CreateTemplateRequest): Promise<WorkflowTemplate> {
  return apiClient.post<WorkflowTemplate>(
    "/api/v1/workflow/templates/",
    data,
  );
}

// ── Versions ──────────────────────────────────────────────────────────────────

export function listVersions(params?: {
  template?: string;
}): Promise<PaginatedResponse<WorkflowTemplateVersion>> {
  return apiClient.get<PaginatedResponse<WorkflowTemplateVersion>>(
    "/api/v1/workflow/versions/",
    params,
  );
}

export function createVersion(data: CreateVersionRequest): Promise<WorkflowTemplateVersion> {
  return apiClient.post<WorkflowTemplateVersion>(
    "/api/v1/workflow/versions/",
    data,
  );
}

export function publishVersion(id: string): Promise<WorkflowTemplateVersion> {
  return apiClient.post<WorkflowTemplateVersion>(
    `/api/v1/workflow/versions/${id}/publish/`,
  );
}

export function archiveVersion(id: string): Promise<WorkflowTemplateVersion> {
  return apiClient.post<WorkflowTemplateVersion>(
    `/api/v1/workflow/versions/${id}/archive/`,
  );
}

// ── Step Groups ────────────────────────────────────────────────────────────────

export function listStepGroups(params?: {
  template_version?: string;
}): Promise<StepGroup[]> {
  return apiClient.get<StepGroup[]>(
    "/api/v1/workflow/groups/",
    params,
  );
}

export function createStepGroup(data: CreateStepGroupRequest): Promise<StepGroup> {
  return apiClient.post<StepGroup>("/api/v1/workflow/groups/", data);
}

// ── Workflow Steps ─────────────────────────────────────────────────────────────

export function listWorkflowSteps(params?: {
  group?: string;
}): Promise<WorkflowStep[]> {
  return apiClient.get<WorkflowStep[]>(
    "/api/v1/workflow/steps/",
    params,
  );
}

export function createWorkflowStep(
  data: CreateWorkflowStepRequest,
): Promise<WorkflowStep> {
  return apiClient.post<WorkflowStep>("/api/v1/workflow/steps/", data);
}

export function updateWorkflowStep(
  id: string,
  data: Partial<CreateWorkflowStepRequest>,
): Promise<WorkflowStep> {
  return apiClient.patch<WorkflowStep>(`/api/v1/workflow/steps/${id}/`, data);
}

export function deleteWorkflowStep(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/workflow/steps/${id}/`);
}

// ── Step Groups ────────────────────────────────────────────────────────────────

export function updateStepGroup(
  id: string,
  data: Partial<CreateStepGroupRequest>,
): Promise<StepGroup> {
  return apiClient.patch<StepGroup>(`/api/v1/workflow/groups/${id}/`, data);
}

export function deleteStepGroup(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/workflow/groups/${id}/`);
}

// ── Versions ──────────────────────────────────────────────────────────────────

export function deleteVersion(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/workflow/versions/${id}/`);
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function updateTemplate(
  id: string,
  data: {
    name?: string;
    module?: string;
    scope_node?: string;
    description?: string;
    is_active?: boolean;
    is_default?: boolean;
  },
): Promise<WorkflowTemplate> {
  return apiClient.patch<WorkflowTemplate>(`/api/v1/workflow/templates/${id}/`, data);
}

export function deleteTemplate(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/workflow/templates/${id}/`);
}
