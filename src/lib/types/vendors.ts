// ── Vendor ────────────────────────────────────────────────────────────────────
// Matches VendorSerializer / VendorDetailSerializer in
// apps/vendors/api/v1/serializers/vendor.py

export interface Vendor {
  // Read-only fields
  id: string;               // read-only
  organization_name: string; // read-only (source: organization.name)
  code: string;             // read-only (set by backend on creation)

  // Writable fields
  organization: string;     // UUID — FK to Organization (required on create)
  name: string;             // vendor display name
  legal_name: string;       // legal / registered name
  tax_id: string;           // tax identification number (e.g. GST/VAT)
  registration_number: string;
  vendor_type: string;      // e.g. "supplier", "agency" — backend enum
  status: string;           // "active" | "inactive" | "pending" etc.
  email: string;            // vendor contact email
  phone: string;            // vendor contact phone
  website: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  payment_terms_days: number | null;
  currency: string;
  is_active: boolean;

  // Nested — bank_accounts & documents are write-only on VendorSerializer
  // and readable (read-only) on VendorDetailSerializer.
  bank_accounts?: VendorBankAccount[];
  documents?: VendorDocument[];
}

// ── VendorBankAccount ────────────────────────────────────────────────────────
// Matches VendorBankAccountSerializer

export interface VendorBankAccount {
  id: string;               // read-only
  account_name: string;
  bank_name: string;
  bank_code: string;
  account_number: string;
  routing_number: string;
  iban: string;
  swift_code: string;
  currency: string;
  country: string;
  is_primary: boolean;
  is_active: boolean;
}

// ── VendorDocument ───────────────────────────────────────────────────────────
// Matches VendorDocumentSerializer

export interface VendorDocument {
  id: string;               // read-only
  document_type: string;
  name: string;
  file: string;
  expiry_date: string | null;
  uploaded_by_id: string | null; // read-only
  notes: string;
}

// ── VendorRegistrationRequest ────────────────────────────────────────────────
// Matches VendorRegistrationRequestListSerializer / DetailSerializer

export interface VendorRegistrationRequest {
  id: string;               // read-only

  // Read-only denormalized fields
  organization_id: string;
  organization_name: string;
  vendor: { id: string; code: string; name: string; status: string } | null;
  requested_by: { id: string; email: string; full_name: string } | null;
  reviewed_by: { id: string; email: string; full_name: string } | null;

  // Writable fields (on create: VendorRegistrationRequestCreateSerializer)
  organization: string;     // UUID FK
  vendor_name: string;
  vendor_legal_name: string;
  vendor_tax_id: string;
  vendor_type: string;
  contact_email: string;
  contact_phone: string;
  notes: string;

  // Status / timestamps (read-only)
  status: string;           // "submitted" | "approved" | "rejected" | etc.
  submitted_at: string | null;
  reviewed_at: string | null;

  // Detail-only nested arrays
  bank_accounts?: VendorBankAccount[];
  documents?: VendorDocument[];
  rejection_reason?: string;
  approval_comment?: string;
}

// ── VendorInvite ─────────────────────────────────────────────────────────────
// Returned after admin creates an invite (VendorInviteResponseSerializer)

export interface VendorInvite {
  id: string;
  organization_id: string;
  organization_name: string;
  contact_email: string;
  contact_name: string;
  token: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

// ── VendorInviteValidation ───────────────────────────────────────────────────
// Returned by GET /api/v1/vendors/invites/validate/?token=...

export interface VendorInviteValidation {
  organization_id: string;
  organization_name: string;
  contact_email: string;
  contact_name: string;
}
