// ── V2 Workflow Config Types ─────────────────────────────────────────────────────
// Reflects NewBackend/apps/workflow/api/serializers/templates.py
// V2 is separate from the old V1 workflow types in workflow.ts / workflowConfig.ts

// ── Enums ──────────────────────────────────────────────────────────────────────

export type VersionStatus = "draft" | "published" | "archived";
export type ParallelMode = "SINGLE" | "ALL_MUST_APPROVE" | "ANY_ONE_APPROVES";
export type RejectionAction =
  | "TERMINATE"
  | "GO_TO_GROUP"
  | "PREVIOUS_STAGE"
  | "RETURN_TO_SPLITTER"
  | "RETURN_TO_SUBMITTER"
  | "BRANCH_CORRECTION";
export type ScopeResolutionPolicy =
  | "SUBJECT_NODE"
  | "ANCESTOR_OF_TYPE"
  | "ORG_ROOT"
  | "FIXED_NODE";
export type StepKind =
  | "NORMAL_APPROVAL"
  | "SPLIT_BY_SCOPE"
  | "JOIN_BRANCHES"
  | "RUNTIME_SPLIT_ALLOCATION";
export type SplitTargetMode = "EXPLICIT_NODES" | "CHILD_NODES";
export type JoinPolicy = "ALL_BRANCHES_MUST_COMPLETE";
export type AssignmentMode =
  | "ROLE_RESOLVED"
  | "EXPLICIT_USER"
  | "APPROVER_POOL"
  | "RUNTIME_SELECTED_FROM_POOL";
export type AllocationTotalPolicy = "MUST_EQUAL_INVOICE_TOTAL" | "CAN_BE_PARTIAL";

// ── Labels for enums ──────────────────────────────────────────────────────────

export const PARALLEL_MODE_LABELS: Record<ParallelMode, string> = {
  SINGLE: "Single",
  ALL_MUST_APPROVE: "All Must Approve",
  ANY_ONE_APPROVES: "Any One Approves",
};

export const REJECTION_ACTION_LABELS: Record<RejectionAction, string> = {
  TERMINATE: "Terminate",
  GO_TO_GROUP: "Go To Group",
  PREVIOUS_STAGE: "Previous Stage",
  RETURN_TO_SPLITTER: "Return to Splitter",
  RETURN_TO_SUBMITTER: "Return to Submitter",
  BRANCH_CORRECTION: "Branch Correction",
};

export const SCOPE_RESOLUTION_LABELS: Record<ScopeResolutionPolicy, string> = {
  SUBJECT_NODE: "Subject Node",
  ANCESTOR_OF_TYPE: "Ancestor of Type",
  ORG_ROOT: "Org Root",
  FIXED_NODE: "Fixed Node",
};

export const VERSION_STATUS_LABELS: Record<VersionStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export const STEP_KIND_LABELS: Record<StepKind, string> = {
  NORMAL_APPROVAL: "Normal Approval",
  SPLIT_BY_SCOPE: "Split by Scope",
  JOIN_BRANCHES: "Join Branches",
  RUNTIME_SPLIT_ALLOCATION: "Runtime Split Allocation",
};

export const ASSIGNMENT_MODE_LABELS: Record<AssignmentMode, string> = {
  ROLE_RESOLVED: "Role Resolved",
  EXPLICIT_USER: "Explicit User",
  APPROVER_POOL: "Approver Pool",
  RUNTIME_SELECTED_FROM_POOL: "Runtime Selected from Pool",
};

export const ALLOCATION_TOTAL_POLICY_LABELS: Record<AllocationTotalPolicy, string> = {
  MUST_EQUAL_INVOICE_TOTAL: "Must Equal Invoice Total",
  CAN_BE_PARTIAL: "Can Be Partial",
};

export const SPLIT_TARGET_MODE_LABELS: Record<SplitTargetMode, string> = {
  EXPLICIT_NODES: "Explicit Nodes",
  CHILD_NODES: "Child Nodes",
};

export const JOIN_POLICY_LABELS: Record<JoinPolicy, string> = {
  ALL_BRANCHES_MUST_COMPLETE: "All Branches Must Complete",
};

// ── Workflow Step ──────────────────────────────────────────────────────────────

export interface WorkflowStep {
  id: string;
  group: string;
  name: string;
  required_role: string | null;
  required_role_name: string | null;
  scope_resolution_policy: ScopeResolutionPolicy;
  ancestor_node_type: string;
  fixed_scope_node: string | null;
  default_user: string | null;
  display_order: number;
  step_kind: StepKind;
  split_target_nodes: string[] | null;
  split_target_mode: SplitTargetMode | null;
  join_policy: JoinPolicy | null;
  // Runtime split allocation config
  allocation_total_policy: AllocationTotalPolicy;
  approver_selection_mode: AssignmentMode;
  require_category: boolean;
  require_subcategory: boolean;
  require_budget: boolean;
  require_campaign: boolean;
  allow_multiple_lines_per_entity: boolean;
  created_at: string;
}

// ── WorkflowSplitOption ───────────────────────────────────────────────────────

export interface SplitOptionUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface WorkflowSplitOption {
  id: string;
  workflow_step: string;
  entity: string;
  entity_name?: string | null;
  approver_role: string | null;
  approver_role_name?: string | null;
  allowed_approvers: number[];           // POST/PATCH payload uses IDs
  allowed_approvers_detail?: SplitOptionUser[]; // GET response may include user detail
  category: string | null;
  category_name?: string | null;
  subcategory: string | null;
  subcategory_name?: string | null;
  campaign: string | null;
  campaign_name?: string | null;
  budget: string | null;
  budget_name?: string | null;
  is_active: boolean;
  display_order: number;
}

// ── Step Group ────────────────────────────────────────────────────────────────

export interface StepGroup {
  id: string;
  template_version: string;
  name: string;
  display_order: number;
  parallel_mode: ParallelMode;
  on_rejection_action: RejectionAction;
  on_rejection_goto_group: string | null;
  steps: WorkflowStep[];
  created_at: string;
}

// ── Workflow Template Version ─────────────────────────────────────────────────

export interface WorkflowTemplateVersion {
  id: string;
  template: string;
  version_number: number;
  status: VersionStatus;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  step_groups: StepGroup[];
}

// ── Workflow Template ─────────────────────────────────────────────────────────

export interface WorkflowTemplate {
  id: string;
  name: string;
  code: string;
  description: string;
  module: string;
  scope_node: string;
  is_active: boolean;
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  versions: WorkflowTemplateVersion[];
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface CreateTemplateRequest {
  name: string;
  module: string;
  scope_node: string;
  code?: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
}

export interface CreateVersionRequest {
  template: string;
  version_number: number;
}

export interface CreateStepGroupRequest {
  template_version: string;
  name: string;
  display_order: number;
  parallel_mode: ParallelMode;
  on_rejection_action: RejectionAction;
  on_rejection_goto_group?: string;
}

export interface CreateWorkflowStepRequest {
  group: string;
  name: string;
  required_role: string;
  scope_resolution_policy: ScopeResolutionPolicy;
  ancestor_node_type?: string;
  fixed_scope_node?: string;
  default_user?: string;
  display_order: number;
  step_kind?: StepKind;
  split_target_nodes?: string[];
  split_target_mode?: SplitTargetMode;
  join_policy?: JoinPolicy;
}
