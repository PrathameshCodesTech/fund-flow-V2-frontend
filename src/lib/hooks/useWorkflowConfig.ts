import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activateWorkflowTemplate,
  archiveTemplateVersion,
  createWorkflowMapping,
  createWorkflowStep,
  createWorkflowTemplate,
  deactivateWorkflowTemplate,
  deleteWorkflowMapping,
  deleteWorkflowStep,
  getWorkflowTemplate,
  listModules,
  listTemplateVersions,
  listWorkflowMappings,
  listWorkflowSteps,
  listWorkflowTemplates,
  publishTemplateVersion,
  updateWorkflowMapping,
  updateWorkflowStep,
  updateWorkflowTemplate,
  validateWorkflowTemplate,
} from '../api/workflowConfig';
import type {
  StepApproverMappingWrite,
  WorkflowTemplateStepWrite,
  WorkflowTemplateWrite,
} from '../types/workflowConfig';

// ── Query keys ────────────────────────────────────────────────────────────────

export const WF_KEYS = {
  modules: ['wf-modules'] as const,
  templates: (params?: object) => ['wf-templates', params] as const,
  template: (id: string) => ['wf-template', id] as const,
  steps: (templateId?: string) => ['wf-steps', templateId] as const,
  mappings: (params?: object) => ['wf-mappings', params] as const,
  versions: (templateId: string, params?: object) => ['wf-versions', templateId, params] as const,
};

// ── Modules ───────────────────────────────────────────────────────────────────

export function useModules() {
  return useQuery({
    queryKey: WF_KEYS.modules,
    queryFn: listModules,
  });
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function useWorkflowTemplates(params?: {
  organization?: string;
  module?: string;
  is_active?: string;
}) {
  return useQuery({
    queryKey: WF_KEYS.templates(params),
    queryFn: () => listWorkflowTemplates(params),
  });
}

export function useWorkflowTemplateDetail(id: string | null) {
  return useQuery({
    queryKey: WF_KEYS.template(id ?? ''),
    queryFn: () => getWorkflowTemplate(id!),
    enabled: !!id,
  });
}

export function useCreateWorkflowTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WorkflowTemplateWrite) => createWorkflowTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wf-templates'] });
    },
  });
}

export function useUpdateWorkflowTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WorkflowTemplateWrite>) => updateWorkflowTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wf-templates'] });
      qc.invalidateQueries({ queryKey: WF_KEYS.template(id) });
    },
  });
}

export function useActivateWorkflowTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => activateWorkflowTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wf-templates'] });
      qc.invalidateQueries({ queryKey: WF_KEYS.template(id) });
    },
  });
}

export function useDeactivateWorkflowTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deactivateWorkflowTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wf-templates'] });
      qc.invalidateQueries({ queryKey: WF_KEYS.template(id) });
    },
  });
}

export function useValidateWorkflowTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => validateWorkflowTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wf-templates'] });
      qc.invalidateQueries({ queryKey: WF_KEYS.template(id) });
    },
  });
}

// ── Steps ─────────────────────────────────────────────────────────────────────

export function useWorkflowSteps(templateId?: string) {
  return useQuery({
    queryKey: WF_KEYS.steps(templateId),
    queryFn: () => listWorkflowSteps(templateId ? { template: templateId } : undefined),
    enabled: !!templateId,
  });
}

export function useCreateWorkflowStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WorkflowTemplateStepWrite) => createWorkflowStep(data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: WF_KEYS.steps(vars.template) });
      qc.invalidateQueries({ queryKey: WF_KEYS.template(vars.template) });
    },
  });
}

export function useUpdateWorkflowStep(stepId: string, templateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WorkflowTemplateStepWrite>) => updateWorkflowStep(stepId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WF_KEYS.steps(templateId) });
      qc.invalidateQueries({ queryKey: WF_KEYS.template(templateId) });
    },
  });
}

export function useDeleteWorkflowStep(templateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stepId: string) => deleteWorkflowStep(stepId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WF_KEYS.steps(templateId) });
      qc.invalidateQueries({ queryKey: WF_KEYS.template(templateId) });
    },
  });
}

// ── Mappings ──────────────────────────────────────────────────────────────────

export function useWorkflowMappings(params?: {
  template?: string;
  template_step?: string;
  is_active?: string;
}) {
  return useQuery({
    queryKey: WF_KEYS.mappings(params),
    queryFn: () => listWorkflowMappings(params),
    enabled: !!(params?.template || params?.template_step),
  });
}

export function useCreateWorkflowMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StepApproverMappingWrite) => createWorkflowMapping(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wf-mappings'] });
      qc.invalidateQueries({ queryKey: ['wf-template'] });
    },
  });
}

export function useUpdateWorkflowMapping(mappingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<StepApproverMappingWrite>) =>
      updateWorkflowMapping(mappingId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wf-mappings'] });
      qc.invalidateQueries({ queryKey: ['wf-template'] });
    },
  });
}

export function useDeleteWorkflowMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: string) => deleteWorkflowMapping(mappingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wf-mappings'] });
      qc.invalidateQueries({ queryKey: ['wf-template'] });
    },
  });
}

// ── Template versions ─────────────────────────────────────────────────────────

export function useTemplateVersions(
  templateId: string | null,
  params?: { state?: string },
) {
  return useQuery({
    queryKey: WF_KEYS.versions(templateId ?? '', params),
    queryFn: () => listTemplateVersions(templateId!, params),
    enabled: !!templateId,
  });
}

export function usePublishTemplateVersion(templateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => publishTemplateVersion(templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wf-versions', templateId] });
    },
  });
}

export function useArchiveTemplateVersion(versionId: string, templateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => archiveTemplateVersion(versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wf-versions', templateId] });
    },
  });
}
