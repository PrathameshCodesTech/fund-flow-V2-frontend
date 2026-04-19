/**
 * Capability helpers for UI gating.
 *
 * Rules:
 *   - Always check user.capabilities (server-computed), never raw role names.
 *   - These helpers control UI visibility only.
 *   - Backend remains the final authority for every action.
 *   - Adding a new role requires zero changes here — only backend ROLE_CAPABILITY_MAP changes.
 */

import type { User } from '@/contexts/AuthContext';

/** Base check: does the user have a specific capability? */
export function can(user: User | null | undefined, capability: string): boolean {
  if (!user) return false;
  return user.capabilities.includes(capability);
}

// ── Vendor ───────────────────────────────────────────────────────────────────

export const canViewVendor    = (u: User | null | undefined) => can(u, 'vendor.view');
export const canCreateVendor  = (u: User | null | undefined) => can(u, 'vendor.create');
export const canManageVendor  = (u: User | null | undefined) => can(u, 'vendor.manage');

// ── Campaign ─────────────────────────────────────────────────────────────────

export const canViewCampaign   = (u: User | null | undefined) => can(u, 'campaign.view');
export const canCreateCampaign = (u: User | null | undefined) => can(u, 'campaign.create');
export const canEditCampaign   = (u: User | null | undefined) => can(u, 'campaign.edit');
export const canManageCampaign = (u: User | null | undefined) => can(u, 'campaign.manage');

// ── Budget ───────────────────────────────────────────────────────────────────

export const canViewBudget   = (u: User | null | undefined) => can(u, 'budget.view');
export const canManageBudget = (u: User | null | undefined) => can(u, 'budget.manage');

// ── Invoice ──────────────────────────────────────────────────────────────────

export const canViewInvoice      = (u: User | null | undefined) => can(u, 'invoice.view');
export const canCreateInvoice    = (u: User | null | undefined) => can(u, 'invoice.create');
export const canEditDraftInvoice = (u: User | null | undefined) => can(u, 'invoice.edit_draft');
export const canCancelInvoice    = (u: User | null | undefined) => can(u, 'invoice.edit_draft');
export const canSubmitInvoice    = (u: User | null | undefined) => can(u, 'invoice.submit');
export const canCommentInvoice   = (u: User | null | undefined) => can(u, 'invoice.comment');
export const canManageInvoice    = (u: User | null | undefined) => can(u, 'invoice.manage');
/** Can return a vendor-submitted invoice to the vendor for correction. */
export const canReviewInvoice    = (u: User | null | undefined) => can(u, 'invoice.review');

// ── Workflow ─────────────────────────────────────────────────────────────────

export const canViewWorkflowTasks  = (u: User | null | undefined) => can(u, 'workflow.task.view');
export const canApproveWorkflow    = (u: User | null | undefined) => can(u, 'workflow.step.approve');
export const canRejectWorkflow     = (u: User | null | undefined) => can(u, 'workflow.step.reject');
export const canManageWorkflow     = (u: User | null | undefined) => can(u, 'workflow.manage');
/** Can reject an under-review invoice back to marketing for rework. */
export const canRejectToMarketing  = (u: User | null | undefined) => can(u, 'workflow.step.reject');

// ── Reporting ────────────────────────────────────────────────────────────────

export const canViewBasicReporting   = (u: User | null | undefined) => can(u, 'reporting.view_basic');
export const canViewRegionReporting  = (u: User | null | undefined) => can(u, 'reporting.view_region');
export const canViewFinanceReporting = (u: User | null | undefined) => can(u, 'reporting.view_finance');
export const canViewAllReporting     = (u: User | null | undefined) => can(u, 'reporting.view_all');

/** True if user can see any reporting/insights section. */
export const canViewReporting = (u: User | null | undefined) =>
  canViewBasicReporting(u) ||
  canViewRegionReporting(u) ||
  canViewFinanceReporting(u) ||
  canViewAllReporting(u);

// ── Org / IAM ────────────────────────────────────────────────────────────────

export const canManageOrganization = (u: User | null | undefined) => can(u, 'organization.manage');
export const canManageIAM          = (u: User | null | undefined) => can(u, 'iam.manage');

// ── Vendor portal ────────────────────────────────────────────────────────────

/** True for vendor-role users who use the dedicated self-service portal. */
export const canUseVendorPortal = (u: User | null | undefined) => can(u, 'portal.vendor');
