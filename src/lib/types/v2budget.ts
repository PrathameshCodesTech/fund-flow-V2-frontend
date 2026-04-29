// ── V2 Budget Types ─────────────────────────────────────────────────────────────
// Reflects NewBackend/apps/budgets/models.py

import type { PaginatedResponse } from "./core";

// ── Enums ────────────────────────────────────────────────────────────────────

export type PeriodType = "yearly" | "quarterly" | "monthly" | "campaign";
export type BudgetStatus = "draft" | "active" | "exhausted" | "frozen" | "closed";
export type ConsumptionType = "reserved" | "consumed" | "released" | "adjusted";
export type ConsumptionStatus = "pending" | "applied" | "reversed";
export type VarianceStatus = "pending" | "approved" | "rejected" | "cancelled";
export type SourceType =
  | "campaign"
  | "invoice"
  | "invoice_allocation"
  | "manual_expense"
  | "manual_adjustment";

// ── Import enums ──────────────────────────────────────────────────────────────

export type ImportMode = "setup_only" | "safe_update" | "full";
export type ImportBatchStatus = "pending" | "validated" | "committed" | "failed";
export type ImportRowStatus = "pending" | "valid" | "error" | "committed" | "skipped";

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
  invoice_allocation: "Invoice Allocation",
  manual_expense: "Manual Expense",
  manual_adjustment: "Manual Adjustment",
};

export const IMPORT_MODE_LABELS: Record<ImportMode, string> = {
  setup_only: "Setup Only (Create Only)",
  safe_update: "Safe Update (Skip In-Use)",
  full: "Full Update",
};

export const IMPORT_MODE_DESCRIPTIONS: Record<ImportMode, string> = {
  setup_only: "Only create new Budget/BudgetLine records. Existing records are skipped silently.",
  safe_update: "Create new records AND update non-operational existing records. In-use records are skipped.",
  full: "Create new records AND update ALL existing records. Use with explicit intent.",
};

export const IMPORT_BATCH_STATUS_LABELS: Record<ImportBatchStatus, string> = {
  pending: "Pending",
  validated: "Validated",
  committed: "Committed",
  failed: "Failed",
};

export const IMPORT_ROW_STATUS_LABELS: Record<ImportRowStatus, string> = {
  pending: "Pending",
  valid: "Valid",
  error: "Error",
  committed: "Committed",
  skipped: "Skipped",
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
  reserved_amount: string;
  consumed_amount: string;
  available_amount: string;
  budgets_count: number;
  campaigns_count: number;
}

export interface BudgetSubcategoryOverview {
  id: number;
  name: string;
  category_name: string;
  allocated_amount: string;
  reserved_amount: string;
  consumed_amount: string;
  available_amount: string;
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

// ── Import Batch models ──────────────────────────────────────────────────────

export interface BudgetImportRow {
  id: number;
  row_number: number;
  status: ImportRowStatus;
  // Raw Excel values
  raw_scope_node_code: string;
  raw_budget_code: string;
  raw_budget_name: string;
  raw_financial_year: string;
  raw_period_type: string;
  raw_period_start: string;
  raw_period_end: string;
  raw_category_code: string;
  raw_subcategory_code: string;
  raw_allocated_amount: string;
  raw_currency: string;
  // Resolved FK IDs (null if resolution failed)
  resolved_scope_node: number | null;
  resolved_category: number | null;
  resolved_subcategory: number | null;
  resolved_budget: number | null;
  resolved_budget_line: number | null;
  // Validation
  errors: string[];
  skipped_reason: string;
}

export interface BudgetImportBatch {
  id: number;
  org: number;
  file_name: string;
  financial_year: string;
  status: ImportBatchStatus;
  import_mode: ImportMode;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  skipped_rows: number;
  committed_rows: number;
  validation_errors: string[];
  created_by: number | null;
  created_by_email: string | null;
  committed_by: number | null;
  committed_by_email: string | null;
  committed_at: string | null;
  created_at: string;
  updated_at: string;
  rows: BudgetImportRow[];
}

export type BudgetImportBatchList = Omit<BudgetImportBatch, "rows" | "validation_errors">;

// ── Live Balances ─────────────────────────────────────────────────────────────

export interface BudgetLineLiveBalance {
  id: number;
  category_id: number;
  category_name: string;
  subcategory_id: number | null;
  subcategory_name: string | null;
  allocated_amount: string;
  reserved_amount: string;
  consumed_amount: string;
  available_amount: string;
}

export interface BudgetLiveBalances {
  budget_id: number;
  allocated_amount: string;
  reserved_amount: string;
  consumed_amount: string;
  available_amount: string;
  utilization_percent: string;
  lines: BudgetLineLiveBalance[];
}

// ── In-Use Summary ────────────────────────────────────────────────────────────

export interface BudgetInUseSummary {
  is_in_use: boolean;
  has_ledger_history: boolean;
  net_reserved: string;
  consumed_total: string;
  pending_variance_count: number;
  linked_invoice_allocations_count: number;
  linked_manual_expenses_count: number;
  linked_campaign_count: number;
  lines_in_use_count: number;
  blocking_reasons: string[];
}

export interface BudgetOverviewPayload {
  summary: BudgetOverviewSummary;
  regions: BudgetRegionOverview[];
  parks: BudgetParkOverview[];
  categories: BudgetCategoryOverview[];
  subcategories: BudgetSubcategoryOverview[];
  campaigns: BudgetCampaignOverview[];
}
