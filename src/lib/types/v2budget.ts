// ── V2 Budget Types ─────────────────────────────────────────────────────────────
// Reflects NewBackend/apps/budgets/models.py

import type { PaginatedResponse } from "./core";

// ── Enums ────────────────────────────────────────────────────────────────────

export type PeriodType = "yearly" | "quarterly" | "monthly" | "campaign";
export type BudgetStatus = "draft" | "active" | "exhausted" | "frozen" | "closed";
export type ConsumptionType = "reserved" | "consumed" | "released" | "adjusted";
export type ConsumptionStatus = "pending" | "applied" | "reversed";
export type VarianceStatus = "pending" | "approved" | "rejected" | "cancelled";
export type SourceType = "campaign" | "invoice" | "manual_adjustment";

// ── Labels ────────────────────────────────────────────────────────────────────

export const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
  yearly: "Yearly",
  quarterly: "Quarterly",
  monthly: "Monthly",
  campaign: "Campaign",
};

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  draft: "Draft",
  active: "Active",
  exhausted: "Exhausted",
  frozen: "Frozen",
  closed: "Closed",
};

export const CONSUMPTION_TYPE_LABELS: Record<ConsumptionType, string> = {
  reserved: "Reserved",
  consumed: "Consumed",
  released: "Released",
  adjusted: "Adjusted",
};

export const CONSUMPTION_STATUS_LABELS: Record<ConsumptionStatus, string> = {
  pending: "Pending",
  applied: "Applied",
  reversed: "Reversed",
};

export const VARIANCE_STATUS_LABELS: Record<VarianceStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  campaign: "Campaign",
  invoice: "Invoice",
  manual_adjustment: "Manual Adjustment",
};

// ── Models ────────────────────────────────────────────────────────────────────

export interface BudgetCategory {
  id: string;
  org: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetSubCategory {
  id: string;
  category: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // expanded
  category_name?: string;
  category_code?: string;
}

// ── BudgetLine ────────────────────────────────────────────────────────────────

export interface BudgetLine {
  id: string;
  budget: string;
  category: string;
  subcategory: string | null;
  allocated_amount: string;
  reserved_amount: string;
  consumed_amount: string;
  // expanded
  category_name?: string;
  subcategory_name?: string;
  available_amount?: string;
  utilization_percent?: number;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  org: string;
  scope_node: string;
  // header fields (name+code replace category-level allocation)
  name: string;
  code: string;
  // no category/subcategory — those live on BudgetLine
  financial_year: string;
  period_type: PeriodType;
  period_start: string | null;
  period_end: string | null;
  allocated_amount: string;
  reserved_amount: string;
  consumed_amount: string;
  currency: string;
  status: BudgetStatus;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // expanded
  scope_node_name?: string;
  // computed helpers
  available_amount?: string;
  utilization_percent?: number;
  has_rule?: boolean;
  lines?: BudgetLine[];
}

export interface BudgetRule {
  id: string;
  budget: string;
  warning_threshold_percent: string;
  approval_threshold_percent: string;
  hard_block_threshold_percent: string;
  allowed_variance_percent: string;
  require_hod_approval_on_variance: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // expanded
  budget_name?: string;
}

export interface BudgetConsumption {
  id: string;
  budget: string;
  budget_line: string | null; // optional FK to BudgetLine
  source_type: SourceType;
  source_id: string;
  amount: string;
  consumption_type: ConsumptionType;
  status: ConsumptionStatus;
  created_by: string | null;
  note: string;
  created_at: string;
  // expanded
  budget_name?: string;
  created_by_email?: string;
}

export interface BudgetVarianceRequest {
  id: string;
  budget: string;
  budget_line: string | null; // optional FK to BudgetLine
  source_type: SourceType;
  source_id: string;
  requested_amount: string;
  current_utilization_percent: string;
  projected_utilization_percent: string;
  reason: string;
  status: VarianceStatus;
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string;
  created_at: string;
  updated_at: string;
  // expanded
  budget_name?: string;
  requested_by_email?: string;
  reviewed_by_email?: string;
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface CreateCategoryRequest {
  org: string;
  name: string;
  code: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  code?: string;
  is_active?: boolean;
}

export interface CreateSubCategoryRequest {
  category: string;
  name: string;
  code: string;
}

export interface UpdateSubCategoryRequest {
  name?: string;
  code?: string;
  is_active?: boolean;
}

// ── BudgetLine request shapes ────────────────────────────────────────────────

export interface CreateBudgetLineRequest {
  category: string;
  subcategory?: string | null;
  allocated_amount: string;
}

export interface UpdateBudgetLineRequest {
  category?: string;
  subcategory?: string | null;
  allocated_amount?: string;
}

// ── Budget request shapes ─────────────────────────────────────────────────────

export interface CreateBudgetRequest {
  org?: string;
  scope_node: string;
  name: string;
  code: string;
  financial_year?: string;
  period_type?: PeriodType;
  period_start?: string;
  period_end?: string;
  allocated_amount: string;
  currency?: string;
  status?: BudgetStatus;
  lines?: CreateBudgetLineRequest[];
}

export interface UpdateBudgetRequest {
  name?: string;
  code?: string;
  financial_year?: string;
  period_type?: PeriodType;
  period_start?: string;
  period_end?: string;
  allocated_amount?: string;
  currency?: string;
  status?: BudgetStatus;
  // Nested line upsert: include existing lines with id to update, new lines without id;
  // absent lines with zero usage are deleted by backend; absent with usage → error
  lines?: (CreateBudgetLineRequest & { id?: string })[];
}

// ── Reserve / Consume / Release request shapes ────────────────────────────────

export interface ReserveBudgetLineRequest {
  budget_line_id: number;
  amount: string;
  source_type: SourceType;
  source_id: string;
  note?: string;
}

export interface ConsumeBudgetLineRequest {
  budget_line_id: number;
  amount: string;
  source_type: SourceType;
  source_id: string;
  note?: string;
}

export interface ReleaseBudgetLineRequest {
  budget_line_id: number;
  amount: string;
  source_type: SourceType;
  source_id: string;
  note?: string;
}

// ── Runtime response shapes ───────────────────────────────────────────────────

export interface ReserveBudgetLineResponse {
  status: "reserved" | "reserved_with_warning" | "variance_required";
  projected_utilization: string;
  current_utilization: string;
  consumption: BudgetConsumption | null;
  variance_request: BudgetVarianceRequest | null;
}

export interface ConsumeBudgetLineResponse {
  status: "consumed";
  consumption: BudgetConsumption;
}

export interface ReleaseBudgetLineResponse {
  status: "released";
  consumption: BudgetConsumption;
}

export interface CreateRuleRequest {
  budget: string;
  warning_threshold_percent?: string;
  approval_threshold_percent?: string;
  hard_block_threshold_percent?: string;
  allowed_variance_percent?: string;
  require_hod_approval_on_variance?: boolean;
  is_active?: boolean;
}

export interface UpdateRuleRequest {
  warning_threshold_percent?: string;
  approval_threshold_percent?: string;
  hard_block_threshold_percent?: string;
  allowed_variance_percent?: string;
  require_hod_approval_on_variance?: boolean;
  is_active?: boolean;
}

export interface ReviewVarianceRequest {
  decision: "approved" | "rejected";
  review_note?: string;
}

// ── Paginated responses ──────────────────────────────────────────────────────

export type CategoryListResponse = PaginatedResponse<BudgetCategory>;
export type SubCategoryListResponse = PaginatedResponse<BudgetSubCategory>;
export type BudgetListResponse = PaginatedResponse<Budget>;
export type BudgetLineListResponse = PaginatedResponse<BudgetLine>;
export type RuleListResponse = PaginatedResponse<BudgetRule>;
export type ConsumptionListResponse = PaginatedResponse<BudgetConsumption>;
export type VarianceRequestListResponse = PaginatedResponse<BudgetVarianceRequest>;

// ── Budget Overview ───────────────────────────────────────────────────────────

export interface BudgetOverviewSummary {
  total_allocated: string;
  total_reserved: string;
  total_consumed: string;
  total_available: string;
  regions_count: number;
  parks_count: number;
  campaigns_count: number;
  budgets_count: number;
}

export interface BudgetRegionOverview {
  id: number;
  name: string;
  allocated_amount: string;
  reserved_amount: string;
  consumed_amount: string;
  available_amount: string;
  utilization_percent: number;
  parks_count: number;
  budgets_count: number;
}

export interface BudgetSubcategoryTop {
  id: number;
  name: string;
  amount: string;
}

export interface BudgetParkOverview {
  id: number;
  region_id: number;
  region_name: string;
  name: string;
  allocated_amount: string;
  reserved_amount: string;
  consumed_amount: string;
  available_amount: string;
  utilization_percent: number;
  budgets_count: number;
  top_subcategories: BudgetSubcategoryTop[];
}

export interface BudgetCategoryOverview {
  id: number;
  name: string;
  allocated_amount: string;
  budgets_count: number;
  campaigns_count: number;
}

export interface BudgetSubcategoryOverview {
  id: number;
  name: string;
  category_name: string;
  allocated_amount: string;
}

export interface BudgetCampaignOverview {
  id: number;
  name: string;
  scope_node_name: string;
  region_name: string;
  category_name: string;
  subcategory_name: string;
  approved_amount: string;
  status: string;
}

export interface BudgetOverviewPayload {
  summary: BudgetOverviewSummary;
  regions: BudgetRegionOverview[];
  parks: BudgetParkOverview[];
  categories: BudgetCategoryOverview[];
  subcategories: BudgetSubcategoryOverview[];
  campaigns: BudgetCampaignOverview[];
}
