// ── V2 Workflow Runtime Types ─────────────────────────────────────────────────
// Reflects NewBackend/apps/workflow/api/serializers/instances.py

// ── Status enums ─────────────────────────────────────────────────────────────

export type InstanceStatus = "DRAFT" | "ACTIVE" | "APPROVED" | "REJECTED" | "FROZEN" | "STUCK";
export type GroupStatus = "WAITING" | "IN_PROGRESS" | "APPROVED" | "REJECTED" | "RESET";
export type StepStatus = "WAITING" | "IN_PROGRESS" | "APPROVED" | "REJECTED" | "SKIPPED" | "ORPHANED" | "REASSIGNED" | "WAITING_BRANCHES";
export type BranchStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AssignmentState = "ASSIGNED" | "ASSIGNMENT_REQUIRED" | "NO_ELIGIBLE_USERS";

export const INSTANCE_STATUS_LABELS: Record<InstanceStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  FROZEN: "Frozen",
  STUCK: "Stuck",
};

export const BRANCH_STATUS_LABELS: Record<BranchStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  WAITING: "Waiting",
  IN_PROGRESS: "In Progress",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SKIPPED: "Skipped",
  ORPHANED: "Orphaned",
  REASSIGNED: "Reassigned",
  WAITING_BRANCHES: "Waiting for Branches",
};

// ── Instance Step ─────────────────────────────────────────────────────────────

export interface WorkflowInstanceBranch {
  id: string;
  parent_instance_step: string;
  instance: string;
  target_scope_node: string;
  target_scope_node_name: string | null;
  branch_index: number;
  status: BranchStatus;
  assigned_user: string | null;
  assigned_user_email: string | null;
  assignment_state: AssignmentState;
  acted_at: string | null;
  note: string;
  rejection_reason: string | null;
  reassigned_from_user: string | null;
  reassigned_at: string | null;
  reassigned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowInstanceStep {
  id: string;
  instance_group: string;
  workflow_step: string;
  step_name: string;
  step_kind: string;
  required_role_name: string;
  assigned_user: string | null;
  assignment_state: AssignmentState;
  status: StepStatus;
  acted_at: string | null;
  note: string;
  reassigned_from_user: string | null;
  reassigned_at: string | null;
  reassigned_by: string | null;
  created_at: string;
  updated_at: string;
  branches: WorkflowInstanceBranch[];
}

// ── Instance Group ────────────────────────────────────────────────────────────

export interface WorkflowInstanceGroup {
  id: string;
  instance: string;
  step_group: string;
  display_order: number;
  status: GroupStatus;
  created_at: string;
  updated_at: string;
  instance_steps: WorkflowInstanceStep[];
}

// ── Instance ──────────────────────────────────────────────────────────────────

export interface WorkflowInstance {
  id: string;
  template_version: string;
  template_id: string | null;
  subject_type: string;
  subject_id: string;
  subject_scope_node: string;
  status: InstanceStatus;
  current_group: string | null;
  started_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  instance_groups: WorkflowInstanceGroup[];
}

// ── Task (from /tasks/me/) ────────────────────────────────────────────────────

export type TaskKind = "step" | "branch";

export type TaskStatus = StepStatus | BranchStatus;

export interface WorkflowTask {
  task_kind: TaskKind;
  instance_step_id?: string;
  branch_id?: string;
  instance_id: string;
  subject_type: string;
  subject_id: string;
  subject_scope_node_id: string;
  instance_status: InstanceStatus;
  group_name: string;
  group_order: number;
  step_name: string;
  step_order: number;
  assigned_user_id: string;
  status: TaskStatus;
  created_at: string;
  // Branch-specific fields
  target_scope_node?: string;
  target_scope_node_name?: string;
  split_step_name?: string;
}

// ── Task Review ───────────────────────────────────────────────────────────────

export interface ReviewUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface ReviewTaskMeta {
  task_kind: TaskKind;
  instance_step_id: string | null;
  branch_id: string | null;
  step_name: string;
  step_kind?: string;
  split_step_name?: string;
  group_name: string;
  target_scope_node_id?: string | null;
  target_scope_node_name?: string | null;
  status: string;
  assigned_user: ReviewUser | null;
  reassigned_from_user: ReviewUser | null;
  reassigned_by: ReviewUser | null;
  reassigned_at: string | null;
  created_at: string;
}

export interface ReviewInvoice {
  id: string;
  title: string;
  vendor_invoice_number: string | null;
  amount: string;
  currency: string;
  po_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  status: string;
  description: string | null;
  scope_node_id: string;
  scope_node_name: string;
  submitted_by: ReviewUser | null;
  created_at: string;
}

export interface ReviewVendor {
  id: string;
  vendor_name: string;
  email: string | null;
  phone: string | null;
  sap_vendor_id: string;
  po_mandate_enabled: boolean;
  operational_status: string;
  marketing_status: string;
  gstin: string | null;
  pan: string | null;
}

export interface ReviewDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_type: string;
  has_file: boolean;
}

export interface ReviewSubject {
  type: string;
  missing: boolean;
  invoice?: ReviewInvoice | null;
  vendor?: ReviewVendor | null;
  documents?: ReviewDocument[];
}

export interface ReviewBranch {
  id: string;
  target_scope_node_name: string | null;
  status: string;
  assigned_user: ReviewUser | null;
  acted_at: string | null;
  note: string | null;
  is_current_branch: boolean;
}

export interface ReviewStep {
  id: string;
  step_name: string;
  step_kind: string;
  status: string;
  assigned_user: ReviewUser | null;
  acted_at: string | null;
  note: string | null;
  is_current_step: boolean;
  branches: ReviewBranch[];
}

export interface ReviewGroup {
  id: string;
  name: string;
  display_order: number;
  status: string;
  steps: ReviewStep[];
}

export interface ReviewWorkflow {
  template_name: string;
  template_version_number: number;
  instance_id: string;
  instance_status: string;
  started_at: string | null;
  completed_at: string | null;
  current_group_name: string | null;
  groups: ReviewGroup[];
}

export interface ReviewTimelineEvent {
  id: string;
  event_type: string;
  actor: ReviewUser | null;
  target: ReviewUser | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TaskReviewData {
  task: ReviewTaskMeta;
  subject: ReviewSubject;
  workflow: ReviewWorkflow;
  timeline: ReviewTimelineEvent[];
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface ApproveBranchRequest {
  note?: string;
}

export interface RejectBranchRequest {
  note?: string;
}

export interface ReassignBranchRequest {
  user_id: string;
  note?: string;
}

export interface CreateFromInvoiceRequest {
  invoice_id: string;
  assignments?: Record<string, string>;
  activate?: boolean;
}

export interface ApproveStepRequest {
  note?: string;
}

export interface RejectStepRequest {
  note?: string;
}

export interface ReassignStepRequest {
  user_id: string;
  note?: string;
}

// ── Assignment Plan ───────────────────────────────────────────────────────────

export interface EligibleUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface AssignmentPlanStep {
  instance_step_id: number;
  workflow_step_id: number;
  step_name: string;
  step_kind: string;
  group_name: string;
  group_display_order: number;
  step_display_order: number;
  assigned_user: EligibleUser | null;
  assignment_state: AssignmentState;
  required_role: string;
  required_role_id: number;
  scope_resolution_policy: string;
  resolved_scope_node_id: number | null;
  resolved_scope_node_name: string | null;
  eligible_users: EligibleUser[];
}

export interface AssignmentPlanGroup {
  instance_group_id: number;
  step_group_id: number;
  name: string;
  display_order: number;
  steps: AssignmentPlanStep[];
}

export interface AssignmentPlan {
  instance_id: number;
  status: InstanceStatus;
  subject_type: string;
  subject_id: number;
  groups: AssignmentPlanGroup[];
}
