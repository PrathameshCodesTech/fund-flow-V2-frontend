export interface OrganizationSummary {
  id: string;
  name: string;
  short_name: string;
  website: string;
  primary_currency: string;
  timezone: string;
  fiscal_year_start_month: number;
  is_active: boolean;
}

export interface LegalEntitySummary {
  id: string;
  organization_id: string;
  organization_name: string;
  name: string;
  short_name: string;
  registration_number: string;
  tax_id: string;
  country: string;
  currency: string;
  is_active: boolean;
}

export interface CostCenter {
  id: string;
  organization_id: string;
  organization_name: string;
  legal_entity_id: string | null;
  legal_entity_name: string;
  org_unit_id: string | null;
  org_unit_name: string;
  code: string;
  name: string;
  gl_code: string;
  is_active: boolean;
}
