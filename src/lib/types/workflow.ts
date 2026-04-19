// ── Workflow types — mirrors Backend/apps/workflow/api/v1/serializers/workflow.py ──

import type { InvoiceStatus } from './invoices';

export type WorkflowStepStatus =
  | 'pending'
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'skipped'
  | 'escalated';

export interface InvoiceWorkflowSummary {
  id: string;
  invoice_number: string;
  vendor_invoice_number: string;
  status: InvoiceStatus;
  invoice_date: string;
  currency: string;
  // DRF DecimalField → string
  total_amount: string;
  organization: { id: string; name: string; short_name: string };
  vendor: { id: string; code: string; name: string; legal_name: string };
}

// Returned by ApprovalActionSummarySerializer
export interface ApprovalActionSummary {
  id: string;
  action: 'approve' | 'reject' | 'request_changes' | 'escalate' | 'reassign' | 'skip';
  actor: { id: string; email: string; full_name: string } | null;
  // Field is "comment" (singular) — not "comments"
  comment: string;
  created_at: string;
}

// Returned by WorkflowStepInstanceSerializer
export interface WorkflowStepInstance {
  id: string;
  stage: { id: string; name: string; stage_order: number };
  assigned_to: { id: string; email: string; full_name: string } | null;
  status: WorkflowStepStatus;
  due_at: string | null;
  completed_at: string | null;
  notes: string;
  approval_actions: ApprovalActionSummary[];
  created_at: string;
  updated_at: string;
}

// Returned by WorkflowTaskSerializer (used for My Tasks list)
export interface WorkflowTask {
  id: string;
  workflow_instance_id: string;
  workflow: { id: string; code: string; name: string };
  stage: { id: string; name: string; stage_order: number };
  assigned_to: { id: string; email: string; full_name: string } | null;
  status: WorkflowStepStatus;
  due_at: string | null;
  invoice: InvoiceWorkflowSummary | null;
  created_at: string;
}

// Returned by WorkflowInstanceDetailSerializer
export interface WorkflowInstance {
  id: string;
  workflow: { id: string; code: string; name: string };
  invoice: InvoiceWorkflowSummary | null;
  initiated_by: { id: string; email: string; full_name: string } | null;
  current_stage: { id: string; name: string; stage_order: number } | null;
  is_complete: boolean;
  completed_at: string | null;
  final_outcome: string;
  step_instances: WorkflowStepInstance[];
  created_at: string;
  updated_at: string;
}

// Returned by WorkflowStepActionSerializer (approve/reject response)
export interface WorkflowStepActionResult {
  workflow_instance_id: string;
  workflow_is_complete: boolean;
  final_outcome: string;
  invoice_status: InvoiceStatus;
  step: WorkflowStepInstance;
}
