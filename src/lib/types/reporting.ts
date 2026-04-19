export interface CurrencyAmountRow {
  currency: string;
  total_amount: string;
}

export interface DashboardSummary {
  total_vendors: number;
  total_campaigns: number;
  total_budget_versions: number;
  total_invoices: number;
  draft_invoices: number;
  under_review_invoices: number;
  approved_invoices: number;
  rejected_invoices: number;
  pending_tasks_for_current_user: number;
  submitted_invoice_amount: string | null;
  submitted_invoice_amounts_by_currency: CurrencyAmountRow[];
  under_review_invoice_amount: string | null;
  under_review_invoice_amounts_by_currency: CurrencyAmountRow[];
  approved_invoice_amount: string | null;
  approved_invoice_amounts_by_currency: CurrencyAmountRow[];
}

export interface PendingApprovalsSummary {
  pending_task_count: number;
  in_progress_task_count: number;
}

export interface BudgetVsSpendRow {
  organization_id: string;
  organization_name: string;
  period_id: string;
  period_name: string;
  budget_version_id: string;
  budget_version_name: string;
  version_number: number;
  currency: string;
  budget_total: string;
  approved_invoice_total: string;
  in_review_invoice_total: string;
  remaining_budget: string;
}

export interface VendorSpendRow {
  vendor_id: string;
  vendor_code: string;
  vendor_name: string;
  currency: string;
  invoice_count: number;
  total_amount: string;
  approved_amount: string;
  in_review_amount: string;
}

export interface CampaignSpendRow {
  campaign_id: string;
  campaign_code: string;
  campaign_name: string;
  currency: string;
  invoice_count: number;
  allocation_total: string;
  approved_allocation_total: string;
  in_review_allocation_total: string;
}

export interface InvoiceStatusSummaryRow {
  status: string;
  status_display: string;
  currency: string;
  invoice_count: number;
  total_amount: string;
}

export interface ReportingFilters {
  organization?: string;
  legal_entity?: string;
  vendor?: string;
  campaign?: string;
  budget_version?: string;
  status?: string | string[];
  date_from?: string;
  date_to?: string;
  invoice_date_from?: string;
  invoice_date_to?: string;
}

export type BudgetVsSpendFilters = Omit<ReportingFilters, 'campaign'>;
