import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyWorkflowTasks,
  approveWorkflowStep,
  rejectWorkflowStep,
  reassignWorkflowStep,
  getWorkflowInstance,
} from '../api/workflow';

// ── Source-of-truth notes ─────────────────────────────────────────────────────
//
// These hooks are the PRIMARY surface for invoice routing after submit.
//
// Routing after invoice submit:
//   useApproveWorkflowStep  → advances the invoice to the next workflow step
//   useRejectWorkflowStep    → returns the invoice to a prior step (or ends rejected)
//   useReassignWorkflowStep  → reassigns the current step to a different approver
//
// ENTRY (not handled here — use useSubmitInvoice in useInvoices.ts):
//   An invoice enters the workflow only via submitInvoice().
//   Workflow-step actions are meaningless before an invoice is submitted.
//
// invoice.status is derived from workflow state — do NOT treat it as routing authority.
// ─────────────────────────────────────────────────────────────────────────────

export function useWorkflowTasks(params?: { status?: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['workflowTasks', params],
    queryFn: () => getMyWorkflowTasks(params),
  });
  return { tasks: data ?? [], isLoading, error };
}

export function useWorkflowInstance(instanceId: string | undefined) {
  return useQuery({
    queryKey: ['workflowInstance', instanceId],
    queryFn: () => getWorkflowInstance(instanceId!),
    enabled: !!instanceId,
  });
}

export function useApproveWorkflowStep() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: ({ stepId, comment }: { stepId: string; comment?: string }) =>
      approveWorkflowStep(stepId, comment),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['workflowTasks'] });
      queryClient.invalidateQueries({
        queryKey: ['workflowInstance', result.workflow_instance_id],
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
  return { approve: mutateAsync, isApproving: isPending, approveError: error };
}

export function useRejectWorkflowStep() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: ({ stepId, comment }: { stepId: string; comment?: string }) =>
      rejectWorkflowStep(stepId, comment),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['workflowTasks'] });
      queryClient.invalidateQueries({
        queryKey: ['workflowInstance', result.workflow_instance_id],
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
  return { reject: mutateAsync, isRejecting: isPending, rejectError: error };
}

// Reassigns an active step to a different approver.
// Only the current assignee or staff may reassign.
// The invoice stays at the same step — only the assignee changes.
export function useReassignWorkflowStep() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: ({ stepId, assignee, comment }: { stepId: string; assignee: string; comment?: string }) =>
      reassignWorkflowStep(stepId, assignee, comment),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['workflowTasks'] });
      queryClient.invalidateQueries({
        queryKey: ['workflowInstance', result.workflow_instance_id],
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
  return { reassign: mutateAsync, isReassigning: isPending, reassignError: error };
}
