import { apiClient } from "./client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OpsDashboardPayload {
  kpis: {
    pending_task_count: number;
    pending_workflow_invoices: number;
    in_review_invoices: number;
    finance_pending_invoices: number;
    unresolved_finance_handoffs: number;
    vendor_submissions_pending: number;
    blocked_draft_instances_count: number;
  };
  attention_queues: {
    stuck_invoices: StuckInvoice[];
    blocked_steps: BlockedStep[];
    blocked_draft_instances: BlockedDraftInstance[];
  };
  my_work: {
    pending_tasks: PendingTask[];
    recent_approvals: RecentApproval[];
  };
  recent_activity: {
    finance_handoffs: RecentFinanceHandoff[];
    vendor_submissions: RecentVendorSubmission[];
  };
  lifecycle_summary: {
    invoices_by_status: { status: string; count: number }[];
    workflow_instances_by_status: { status: string; count: number }[];
  };
}

export interface StuckInvoice {
  id: string;
  title: string;
  status: string;
  amount: string;
  currency: string;
  scope_node__name: string;
  created_by__email: string;
  updated_at: string;
}

export interface BlockedStep {
  id: string;
  status: string;
  assignment_state: string;
  instance_group__instance_id: number;
  instance_group__instance__subject_type: string;
  instance_group__instance__subject_id: number;
  instance_group__instance__subject_scope_node__name: string;
  workflow_step__name: string;
  assigned_user__email: string | null;
}

export interface BlockedDraftInstance {
  id: string;
  subject_type: string;
  subject_id: number;
  status: string;
  template_version__template__name: string;
  subject_scope_node__name: string;
}

export interface PendingTask {
  kind: "step" | "branch";
  id: number;
  instance_id: number;
  subject_type: string;
  subject_id: number;
  subject_scope_node: string;
  group_name: string;
  step_name: string;
  status: string;
  assignment_state: string;
  created_at: string;
}

export interface RecentApproval {
  id: number;
  event_type: string;
  actor_email: string;
  created_at: string;
  instance?: {
    id: number;
    subject_type: string;
    subject_id: number;
  };
}

export interface RecentFinanceHandoff {
  id: string;
  module: string;
  subject_type: string;
  subject_id: number;
  status: string;
  finance_reference_id: string | null;
  sent_at: string | null;
  created_at: string;
  scope_node__name: string;
  submitted_by__email: string | null;
}

export interface RecentVendorSubmission {
  id: string;
  vendor_name: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  scope_node__name: string;
}

// ── Invoice Control Tower ─────────────────────────────────────────────────────

export interface InvoiceControlTowerPayload {
  invoice: {
    id: string;
    title: string;
    status: string;
    amount: string;
    currency: string;
    po_number: string | null;
    vendor_name: string | null;
    scope_node_id: string;
    scope_node_name: string;
    created_by_email: string | null;
    created_at: string;
    updated_at: string;
  };
  workflow_template: { id: string; name: string } | null;
  workflow_version: { id: string; version_number: number } | null;
  lifecycle_phase: string;
  active_instance: {
    id: number;
    status: string;
    started_at: string | null;
    completed_at: string | null;
  } | null;
  current_group: {
    id: number;
    name: string;
    status: string;
    display_order: number;
  } | null;
  current_steps: CurrentStep[];
  workflow_groups: WorkflowGroup[];
  workflow_timeline: WorkflowTimelineEvent[];
  finance_handoff: FinanceHandoffSummary | null;
  blockers: Blocker[];
}

export interface CurrentStep {
  id: number;
  name: string;
  status: string;
  assignment_state: string;
  assigned_user_email: string | null;
  acted_at: string | null;
}

export interface WorkflowGroup {
  id: number;
  name: string;
  display_order: number;
  status: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: number;
  name: string;
  status: string;
  assignment_state: string;
  step_kind: string;
  assigned_user_email: string | null;
  acted_at: string | null;
  note: string;
  branches: WorkflowBranch[];
}

export interface WorkflowBranch {
  id: number;
  target_scope_node_name: string | null;
  status: string;
  assignment_state: string;
  assigned_user_email: string | null;
  acted_at: string | null;
  note: string;
}

export interface WorkflowTimelineEvent {
  id: number;
  event_type: string;
  actor_email: string | null;
  target_email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface FinanceHandoffSummary {
  id: string;
  status: string;
  finance_reference_id: string | null;
  sent_at: string | null;
  recipient_count: number | null;
  created_at: string;
}

export interface Blocker {
  type: string;
  step_id: number;
  step_name: string;
  group_name: string;
  assignment_state: string;
}

// ── Insights ─────────────────────────────────────────────────────────────────

export interface InsightsPayload {
  invoice_status_distribution: { status: string; count: number }[];
  entity_volume: EntityVolumeItem[];
  finance_turnaround: FinanceTurnaroundItem[];
  stage_turnaround: StageTurnaroundItem[];
  bottleneck_stages: BottleneckStageItem[];
}

export interface EntityVolumeItem {
  scope_node__id: string;
  scope_node__name: string;
  count: number;
  total_amount: number | null;
}

export interface FinanceTurnaroundItem {
  handoff_id: string;
  module: string;
  subject_type: string;
  subject_id: number;
  decision: string;
  turnaround_hours: number;
  acted_at: string;
}

export interface StageTurnaroundItem {
  group_name: string;
  avg_turnaround_hours: number;
  count: number;
}

export interface BottleneckStageItem {
  id: number;
  created_at: string;
  instance_group__step_group__name: string;
  workflow_step__name: string;
  assigned_user__email: string | null;
  instance_group__instance__subject_type: string;
  instance_group__instance__subject_id: number;
  instance_group__instance__subject_scope_node__name: string;
}

// ── API Functions ─────────────────────────────────────────────────────────────

export function getOpsDashboard(): Promise<OpsDashboardPayload> {
  return apiClient.get<OpsDashboardPayload>("/api/v1/dashboard/ops/");
}

export function getInvoiceControlTower(invoiceId: string): Promise<InvoiceControlTowerPayload> {
  return apiClient.get<InvoiceControlTowerPayload>(`/api/v1/invoices/${invoiceId}/control-tower/`);
}

export function getInsights(): Promise<InsightsPayload> {
  return apiClient.get<InsightsPayload>("/api/v1/dashboard/insights/");
}
