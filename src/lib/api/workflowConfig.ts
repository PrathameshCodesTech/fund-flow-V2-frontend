import { apiClient } from './client';
import type {
  Module,
  PaginatedResponse,
  StepApproverMapping,
  StepApproverMappingWrite,
  WorkflowTemplateDetail,
  WorkflowTemplateListItem,
  WorkflowTemplateStep,
  WorkflowTemplateStepWrite,
  WorkflowTemplateVersionDetail,
  WorkflowTemplateVersionListItem,
  WorkflowTemplateWrite,
} from '../types/workflowConfig';

// ── Modules ───────────────────────────────────────────────────────────────────

export function listModules(): Promise<Module[]> {
  return apiClient.get<Module[]>('/api/v1/iam/modules/');
}

// ── WorkflowTemplate ──────────────────────────────────────────────────────────

export function listWorkflowTemplates(params?: {
  organization?: string;
  module?: string;
  is_active?: string;
}): Promise<PaginatedResponse<WorkflowTemplateListItem>> {
  return apiClient.get<PaginatedResponse<WorkflowTemplateListItem>>(
    '/api/v1/workflow/config/templates/',
    params,
  );
}

export function getWorkflowTemplate(id: string): Promise<WorkflowTemplateDetail> {
  return apiClient.get<WorkflowTemplateDetail>(`/api/v1/workflow/config/templates/${id}/`);
}

export function createWorkflowTemplate(data: WorkflowTemplateWrite): Promise<WorkflowTemplateDetail> {
  return apiClient.post<WorkflowTemplateDetail>('/api/v1/workflow/config/templates/', data);
}

export function updateWorkflowTemplate(
  id: string,
  data: Partial<WorkflowTemplateWrite>,
): Promise<WorkflowTemplateDetail> {
  return apiClient.patch<WorkflowTemplateDetail>(`/api/v1/workflow/config/templates/${id}/`, data);
}

export function activateWorkflowTemplate(id: string): Promise<WorkflowTemplateDetail> {
  return apiClient.post<WorkflowTemplateDetail>(`/api/v1/workflow/config/templates/${id}/activate/`);
}

export function deactivateWorkflowTemplate(id: string): Promise<WorkflowTemplateDetail> {
  return apiClient.post<WorkflowTemplateDetail>(
    `/api/v1/workflow/config/templates/${id}/deactivate/`,
  );
}

export interface ValidateTemplateResult {
  valid: boolean;
  errors: string[];
}

export function validateWorkflowTemplate(
  id: string,
): Promise<ValidateTemplateResult> {
  return apiClient.post<ValidateTemplateResult>(
    `/api/v1/workflow/config/templates/${id}/validate/`,
  );
}

// ── WorkflowTemplateStep ──────────────────────────────────────────────────────

export function listWorkflowSteps(params?: {
  template?: string;
}): Promise<PaginatedResponse<WorkflowTemplateStep>> {
  return apiClient.get<PaginatedResponse<WorkflowTemplateStep>>(
    '/api/v1/workflow/config/steps/',
    params,
  );
}

export function getWorkflowStep(id: string): Promise<WorkflowTemplateStep> {
  return apiClient.get<WorkflowTemplateStep>(`/api/v1/workflow/config/steps/${id}/`);
}

export function createWorkflowStep(data: WorkflowTemplateStepWrite): Promise<WorkflowTemplateStep> {
  return apiClient.post<WorkflowTemplateStep>('/api/v1/workflow/config/steps/', data);
}

export function updateWorkflowStep(
  id: string,
  data: Partial<WorkflowTemplateStepWrite>,
): Promise<WorkflowTemplateStep> {
  return apiClient.patch<WorkflowTemplateStep>(`/api/v1/workflow/config/steps/${id}/`, data);
}

export function deleteWorkflowStep(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/v1/workflow/config/steps/${id}/`);
}

// ── StepApproverMapping ───────────────────────────────────────────────────────

export function listWorkflowMappings(params?: {
  template?: string;
  template_step?: string;
  is_active?: string;
}): Promise<PaginatedResponse<StepApproverMapping>> {
  return apiClient.get<PaginatedResponse<StepApproverMapping>>(
    '/api/v1/workflow/config/mappings/',
    params,
  );
}

export function createWorkflowMapping(data: StepApproverMappingWrite): Promise<StepApproverMapping> {
  return apiClient.post<StepApproverMapping>('/api/v1/workflow/config/mappings/', data);
}

export function updateWorkflowMapping(
  id: string,
  data: Partial<StepApproverMappingWrite>,
): Promise<StepApproverMapping> {
  return apiClient.patch<StepApproverMapping>(`/api/v1/workflow/config/mappings/${id}/`, data);
}

export function deleteWorkflowMapping(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/v1/workflow/config/mappings/${id}/`);
}

// ── WorkflowTemplateVersion ───────────────────────────────────────────────────

export function listTemplateVersions(
  templateId: string,
  params?: { state?: string },
): Promise<PaginatedResponse<WorkflowTemplateVersionListItem>> {
  return apiClient.get<PaginatedResponse<WorkflowTemplateVersionListItem>>(
    `/api/v1/workflow/config/templates/${templateId}/versions/`,
    params,
  );
}

export function publishTemplateVersion(
  templateId: string,
): Promise<WorkflowTemplateVersionDetail> {
  return apiClient.post<WorkflowTemplateVersionDetail>(
    `/api/v1/workflow/config/templates/${templateId}/versions/publish/`,
  );
}

export function getTemplateVersion(versionId: string): Promise<WorkflowTemplateVersionDetail> {
  return apiClient.get<WorkflowTemplateVersionDetail>(
    `/api/v1/workflow/config/versions/${versionId}/`,
  );
}

export function archiveTemplateVersion(versionId: string): Promise<WorkflowTemplateVersionDetail> {
  return apiClient.post<WorkflowTemplateVersionDetail>(
    `/api/v1/workflow/config/versions/${versionId}/archive/`,
  );
}
