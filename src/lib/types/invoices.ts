// ── Invoice types — mirrors Backend/apps/invoices/api/v1/serializers/invoice.py ──

export type InvoiceStatus =
  | 'draft'
  | 'submitted'
  | 'marketing_review'
  | 'under_review'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'returned_to_vendor'
  | 'pending_payment'
  | 'paid'
  | 'cancelled'
  | 'on_hold';

// Nested summaries embedded in invoice responses
export interface InvoiceOrgSummary {
  id: string;
  name: string;
  short_name: string;
}

export interface InvoiceLegalEntitySummary {
  id: string;
  name: string;
  short_name: string;
}

export interface InvoiceVendorSummary {
  id: string;
  code: string;
  name: string;
  legal_name: string;
}

export interface InvoiceCampaignSummary {
  id: string;
  code: string;
  name: string;
}

// Returned by InvoiceListSerializer
export interface InvoiceListItem {
  id: string;
  organization: InvoiceOrgSummary;
  legal_entity: InvoiceLegalEntitySummary;
  vendor: InvoiceVendorSummary;
  invoice_number: string;
  vendor_invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  received_date: string | null;
  currency: string;
  // DRF DecimalField → string
  subtotal_amount: string;
  tax_amount: string;
  total_amount: string;
  status: InvoiceStatus;
  status_display: string;
  is_exception: boolean;
  // redacted to "" for non-staff
  exception_reason: string;
  primary_campaign: InvoiceCampaignSummary | null;
  allocation_line_count: number;
  // Set when a reviewer returns the invoice to the vendor for correction
  returned_reason: string;
}

// Returned by InvoiceDetailSerializer (extends InvoiceListItem)
export interface InvoiceDetail extends InvoiceListItem {
  // redacted to null for non-staff
  submitted_by: { id: string; email: string; full_name: string } | null;
  description: string;
  // redacted to "" for non-staff
  internal_notes: string;
  // Set when a reviewer returns the invoice to the vendor for correction
  returned_reason: string;
  // redacted to [] for non-staff
  allocation_lines: InvoiceAllocationLine[];
  // redacted to [] for non-staff
  tax_components: InvoiceTaxComponent[];
  // non-staff sees only non-internal comments
  comments: InvoiceComment[];
  // redacted to [] for non-staff
  validation_issues: InvoiceValidationIssue[];
  // redacted to [] for non-staff
  status_history: InvoiceStatusHistory[];
  // Active workflow step for this invoice (null if no active workflow or step)
  current_workflow_step: {
    id: string;
    step_type: 'vendor' | 'review' | 'approval' | 'payment' | null;
    status: string;
    assigned_to: { id: string; email: string; full_name: string } | null;
  } | null;
  // Attached manual-link workflow version (null if using auto-start or not yet attached)
  attached_workflow_version: {
    id: string;
    version_number: number;
    state: string;
    template_id: string;
    template_name: string;
    has_vendor_return_node: boolean;
  } | null;
  created_at: string;
  updated_at: string;
}

// Returned by InvoiceAllocationLineSerializer
export interface InvoiceAllocationLine {
  id: string;
  line_number: number;
  legal_entity: string | null;
  legal_entity_summary: { id: string; name: string; short_name: string } | null;
  org_unit: string | null;
  org_unit_summary: { id: string; code: string; name: string } | null;
  cost_center: string | null;
  cost_center_summary: { id: string; code: string; name: string } | null;
  budget_node: string | null;
  budget_node_summary: {
    id: string;
    code: string;
    name: string;
    approved_amount: string;
    currency: string;
  } | null;
  campaign: string | null;
  campaign_summary: InvoiceCampaignSummary | null;
  allocated_amount: string;
  currency: string;
  description: string;
}

// Returned by InvoiceTaxComponentSerializer
export interface InvoiceTaxComponent {
  id: string;
  tax_type: string;
  tax_code: string;
  rate_percent: string;
  taxable_amount: string;
  tax_amount: string;
  currency: string;
}

// Returned by InvoiceCommentSerializer
export interface InvoiceComment {
  id: string;
  parent: string | null;
  author: { id: string; email: string; full_name: string } | null;
  body: string;
  is_internal: boolean;
  created_at: string;
}

// Returned by InvoiceValidationIssueSerializer
export interface InvoiceValidationIssue {
  id: string;
  rule_code: string;
  message: string;
  severity: string;
  severity_display: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_note: string;
  created_at: string;
}

// Returned by InvoiceStatusHistorySummarySerializer
export interface InvoiceStatusHistory {
  id: string;
  from_status: InvoiceStatus;
  to_status: InvoiceStatus;
  changed_by: { id: string; email: string; full_name: string } | null;
  reason: string;
  created_at: string;
}

// Payload for InvoiceCreateSerializer
export interface InvoiceCreatePayload {
  organization: string;
  legal_entity: string;
  vendor: string;
  invoice_number?: string;
  vendor_invoice_number: string;
  invoice_date: string;
  due_date?: string;
  received_date?: string;
  currency?: string;
  subtotal_amount: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  is_exception?: boolean;
  exception_reason?: string;
  description?: string;
  internal_notes?: string;
}
