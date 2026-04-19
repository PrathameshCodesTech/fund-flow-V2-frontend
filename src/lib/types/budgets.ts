// ── Budget types — mirrors Backend/apps/budgets/api/v1/serializers/budget.py ──

export interface BudgetPeriod {
  id: string;
  organization_id: string;
  organization_name: string;
  name: string;
  fiscal_year: number;
  period_type: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'closed';
}

export interface BudgetVersion {
  id: string;
  period_id: string;
  period_name: string;
  fiscal_year: number;
  organization_id: string;
  organization_name: string;
  name: string;
  version_number: number;
  is_active: boolean;
  notes: string;
  created_by: { id: string; email: string; full_name: string } | null;
}

export interface BudgetNodeType {
  id: string;
  code: string;
  name: string;
  level: number;
}

export interface BudgetNode {
  id: string;
  budget_version_id: string;
  budget_version_name: string;
  period_id: string;
  period_name: string;
  organization_id: string;
  organization_name: string;
  parent_id: string | null;
  code: string;
  name: string;
  description: string;
  node_type: BudgetNodeType;
  org_unit: { id: string; code: string; name: string } | null;
  legal_entity: { id: string; name: string } | null;
  cost_center: { id: string; code: string; name: string } | null;
  depth: number;
  sort_order: number;
  // DRF DecimalField serializes to string; parse before arithmetic
  approved_amount: string;
  currency: string;
  is_active: boolean;
  owner_assignments: {
    id: string;
    user: { id: string; email: string; full_name: string };
    org_unit: { id: string; code: string; name: string } | null;
    role_label: string;
  }[];
  // Tree endpoint nests children; flat endpoint omits this field
  children: BudgetNode[];
}

export interface CurrencyTotal {
  currency: string;
  total_approved_amount: string;
}

export interface BudgetVersionSummary {
  version: {
    id: string;
    name: string;
    version_number: number;
    is_active: boolean;
  };
  period: {
    id: string;
    name: string;
    fiscal_year: number;
    start_date: string;
    end_date: string;
    status: string;
  };
  // null when nodes have mixed currencies
  total_approved_amount: string | null;
  summary_currency: string | null;
  currency_distribution: CurrencyTotal[];
  node_count: number;
  leaf_node_count: number;
}
