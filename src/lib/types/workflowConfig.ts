// ── Workflow Configuration types ─────────────────────────────────────────────
// Mirrors Backend/apps/workflow/api/v1/serializers/config.py

// ── Shared minimal references ─────────────────────────────────────────────────

export interface UserMinimal {
  id: string;
  email: string;
  full_name: string;
}

export interface OrgMinimal {
  id: string;
  name: string;
}

export interface LegalEntityMinimal {
  id: string;
  name: string;
}

export interface OrgUnitMinimal {
  id: string;
  name: string;
  code: string;
}

export interface StepTransitionRef {
  id: string;
  name: string;
  step_order: number;
}

// ── Mapping summary (nested inside template detail steps) ─────────────────────

export interface MappingSummary {
  id: string;
  scope_type: ScopeType;
  scope_type_display: string;
  user_email: string;
  user_full_name: string;
  legal_entity_name: string | null;
  org_unit_name: string | null;
  is_active: boolean;
}

// ── Scope types ───────────────────────────────────────────────────────────────

export type ScopeType = 'org_wide' | 'legal_entity' | 'org_unit';

export const SCOPE_TYPE_LABELS: Record<ScopeType, string> = {
  org_wide: 'Org-Wide',
  legal_entity: 'Legal Entity',
  org_unit: 'Org Unit',
};

export const SCOPE_TYPE_DESCRIPTIONS: Record<ScopeType, string> = {
  org_wide: 'Applies across the entire organization',
  legal_entity: 'Applies only to invoices for that company/legal entity',
  org_unit: 'Applies only to invoices allocated to that org unit',
};

// ── Step types ────────────────────────────────────────────────────────────────

export type StepType = 'vendor' | 'review' | 'approval' | 'payment';

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  vendor: 'Vendor (Start)',
  review: 'Review',
  approval: 'Approval',
  payment: 'Payment',
};

export const STEP_TYPE_DESCRIPTIONS: Record<StepType, string> = {
  vendor: 'Implicit on invoice submit — auto-approved by vendor action',
  review: 'Invoice review (e.g. marketing) — can forward or return to vendor',
  approval: 'Finance/HO approval — approver approves or rejects',
  payment: 'Payment initiation — marks workflow complete on approve (future phase)',
};

// ── Vendor step description — manual-link only ────────────────────────────────

export const VENDOR_STEP_DESCRIPTIONS =
  "Not the start step in manual-link mode. Optional return node only — used as a reject target so the invoice can be sent back to the vendor for correction. Requires a reject-to-step transition from the review step.";

// ── Workflow modes ────────────────────────────────────────────────────────────

export type WorkflowMode = 'manual_link';

export const WORKFLOW_MODE_LABELS: Record<WorkflowMode, string> = {
  manual_link: 'Manual Link',
};

export const WORKFLOW_MODE_DESCRIPTIONS: Record<WorkflowMode, string> = {
  manual_link:
    "Workflow is attached to an invoice manually. Submitter can upload the invoice without a running workflow — attach it later via the invoice detail screen.",
};

// ── Invoice template guidance — manual-link only ─────────────────────────────

export const INVOICE_TEMPLATE_GUIDANCE =
  "REVIEW (start) → APPROVAL → (optional 2nd APPROVAL). Optional VENDOR node only as a reject target for return-to-vendor flows. Vendor is never the start step.";

// ── Steps that require approver mappings ──────────────────────────────────────

/** Step types that require a StepApproverMapping to be functional. */
export const MAPPABLE_STEP_TYPES: StepType[] = ['review', 'approval'];

// ── WorkflowTemplateStep ──────────────────────────────────────────────────────

export interface WorkflowTemplateStep {
  id: string;
  template: string;
  step_order: number;
  name: string;
  step_type: StepType;
  step_type_display: string;
  is_start: boolean;
  is_terminal: boolean;
  approve_to_step: StepTransitionRef | null;
  reject_to_step: StepTransitionRef | null;
  mapping_count: number;
  active_mapping_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplateStepWrite {
  template: string;
  step_order: number;
  name: string;
  step_type: StepType;
  is_start: boolean;
  is_terminal: boolean;
  approve_to_step?: string | null;
  reject_to_step?: string | null;
}

// ── Template step shape inside template detail (from get_steps()) ─────────────

export interface TemplateDetailStep {
  id: string;
  step_order: number;
  name: string;
  step_type: StepType;
  step_type_display: string;
  is_start: boolean;
  is_terminal: boolean;
  approve_to_step: StepTransitionRef | null;
  reject_to_step: StepTransitionRef | null;
  mappings: MappingSummary[];
}

// ── WorkflowTemplate (list) ───────────────────────────────────────────────────

export interface WorkflowTemplateListItem {
  id: string;
  organization: string;
  organization_name: string;
  module: string;
  module_name: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  workflow_mode: WorkflowMode;
  step_count: number;
  created_at: string;
  updated_at: string;
}

// ── WorkflowTemplate (detail) ─────────────────────────────────────────────────

export interface WorkflowTemplateDetail {
  id: string;
  organization: string;
  organization_name: string;
  module: string;
  module_name: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  workflow_mode: WorkflowMode;
  steps: TemplateDetailStep[];
  created_at: string;
  updated_at: string;
}

// ── WorkflowTemplateVersion ───────────────────────────────────────────────────

// v1: versions are published directly from template steps (no editable draft-version stage).
export type VersionState = 'published' | 'archived';

export interface WorkflowTemplateVersionListItem {
  id: string;
  template: string;
  template_name: string;
  template_code: string;
  version_number: number;
  state: VersionState;
  state_display: string;
  has_vendor_return_node: boolean;
  published_at: string | null;
  archived_at: string | null;
  published_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplateVersionDetail extends WorkflowTemplateVersionListItem {
  steps_snapshot: object[];
}

// ── WorkflowTemplate write payload ────────────────────────────────────────────

export interface WorkflowTemplateWrite {
  organization: string;
  module: string;
  code: string;
  name: string;
  description?: string;
  workflow_mode?: WorkflowMode;
}

// ── StepApproverMapping ───────────────────────────────────────────────────────

export interface StepApproverMapping {
  id: string;
  template_step: string;
  scope_type: ScopeType;
  scope_type_display: string;
  organization: OrgMinimal;
  legal_entity: LegalEntityMinimal | null;
  org_unit: OrgUnitMinimal | null;
  user: UserMinimal;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StepApproverMappingWrite {
  template_step: string;
  scope_type: ScopeType;
  organization: string;
  legal_entity?: string | null;
  org_unit?: string | null;
  user: string;
  is_active?: boolean;
}

// ── Module ───────────────────────────────────────────────────────────────────

export interface Module {
  id: string;
  code: string;
  name: string;
}

// ── Activation error response ─────────────────────────────────────────────────

export interface ActivationErrorResponse {
  errors: string[];
}

// ── Paginated wrapper ─────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
