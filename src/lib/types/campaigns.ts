// ── Campaign types — mirrors Backend/apps/campaigns/api/v1/serializers/campaign.py ──

export interface CampaignOwner {
  id: string;
  email: string;
  full_name: string;
}

export interface CampaignBudgetNodeDetail {
  id: string;
  code: string;
  name: string;
  approved_amount: string;
  currency: string;
  budget_version_id: string;
  budget_version_name: string;
  period_id: string;
  period_name: string;
}

export interface CampaignBudgetLink {
  id: string;
  // budget_node UUID is write-only on create; budget_node_detail is the read representation
  budget_node_detail: CampaignBudgetNodeDetail | null;
  // DRF DecimalField serializes to string
  allocated_amount: string;
  currency: string;
  notes: string;
}

export interface CampaignScope {
  id: string;
  legal_entity: string | null;
  legal_entity_name: string | null;
  org_unit: string | null;
  org_unit_name: string | null;
  office_location: string | null;
  office_location_name: string | null;
  notes: string;
}

// Returned by CampaignListSerializer
export interface Campaign {
  id: string;
  organization_id: string;
  organization_name: string;
  code: string;
  name: string;
  description: string;
  campaign_type: string;
  owner: CampaignOwner | null;
  start_date: string | null;
  end_date: string | null;
  // total_budget is nullable (optional manual override on the model)
  total_budget: string | null;
  // sum of all CampaignBudgetLink.allocated_amount
  linked_budget_total: string;
  budget_link_count: number;
  currency: string;
  is_active: boolean;
}

// Returned by CampaignDetailSerializer (extends Campaign)
export interface CampaignDetail extends Campaign {
  scopes: CampaignScope[];
  budget_links: CampaignBudgetLink[];
}

// Payload accepted by CampaignCreateUpdateSerializer
export interface CampaignWritePayload {
  organization: string;
  name: string;
  code: string;
  description?: string;
  campaign_type?: string;
  owner?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  currency?: string;
  is_active?: boolean;
}

// Payload for creating a budget link
export interface CampaignBudgetLinkWritePayload {
  budget_node: string;   // UUID of BudgetNode
  allocated_amount: string | number;
  currency: string;
  notes?: string;
}
