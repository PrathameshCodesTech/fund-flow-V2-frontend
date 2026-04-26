/**
 * VendorOnboardingPage — public token-based vendor onboarding.
 *
 * Route: /vendor/onboarding/:token
 *
 * Flow:
 *   1. Validate token (GET public invitation)
 *   2. Show invalid/expired/cancelled state if token is bad
 *   3. Offer: Manual form OR Excel upload
 *   4. Manual: fill VRF-aligned multi-section form → submitManual
 *   5. Excel: upload workbook, submit
 *   6. Add attachments
 *   7. Finalize
 *   8. Show submitted confirmation
 *
 * VRF Alignment:
 *   The manual form mirrors the Vendor Registration Form (VRF) workbook structure.
 *   Sections, field labels, and groupings follow the VRF document.
 *   Fields not stored as normalized columns are preserved in the `vrf_data` payload
 *   structure and submitted in raw_form_data, matching the Excel upload path.
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getPublicInvitation,
  getPublicSubmission,
  submitManual,
  submitExcel,
  addAttachment,
  finalizeInvitation,
} from "@/lib/api/v2vendor";
import type { VendorInvitation, VendorOnboardingSubmission } from "@/lib/types/v2vendor";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  Send,
  Link2,
  Upload,
  FileText,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function generalApiError(err: unknown): string | null {
  if (err instanceof ApiError) {
    return (
      err.errors["detail"]?.[0] ??
      err.message ??
      null
    );
  }
  if (err instanceof Error) return err.message;
  return null;
}

// ── Form state interfaces ─────────────────────────────────────────────────────
// Mirrors the flat backend normalized field contract + JSON blocks.

interface ContactPersonEntry {
  type: "general_queries" | "secondary";
  name: string;
  designation: string;
  email: string;
  telephone: string;
}

interface HeadOfficeAddressBlock {
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
  fax: string;
}

interface TaxRegistrationBlock {
  tax_registration_nos: string;
  tin_no: string;
  cst_no: string;
  lst_no: string;
  esic_reg_no: string;
  pan_ref_no: string;
  ppf_no: string;
}

interface ManualFormState {
  // Section 1: Business Details
  title: string;
  vendor_name: string;
  vendor_type: string;
  email: string;
  phone: string;
  gst_registered: boolean;
  gstin: string;
  pan: string;

  // Section 2: Billing Address
  address_line1: string;
  address_line2: string;
  address_line3: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  region: string;
  head_office_no: string;
  fax: string;

  // Section 3: Payment Details
  preferred_payment_mode: string;
  beneficiary_name: string;
  bank_name: string;
  account_number: string;
  bank_account_type: string;
  ifsc: string;
  micr_code: string;
  neft_code: string;
  bank_branch_address_line1: string;
  bank_branch_address_line2: string;
  bank_branch_city: string;
  bank_branch_state: string;
  bank_branch_country: string;
  bank_branch_pincode: string;
  bank_phone: string;
  bank_fax: string;

  // Section 4: Contact Persons (JSON block — up to 2 rows)
  contact_persons: [ContactPersonEntry, ContactPersonEntry];

  // Section 5: Head Office Address (JSON block)
  head_office_address: HeadOfficeAddressBlock;

  // Section 6: Tax Registration Details (JSON block)
  tax_registration_details: TaxRegistrationBlock;

  // Section 7: MSME Declaration
  msme_registered: boolean;
  msme_registration_number: string;
  msme_enterprise_type: "" | "micro" | "small" | "medium";
  authorized_signatory_name: string;
  declaration_accepted: boolean;
}

const emptyContactPerson = (): ContactPersonEntry => ({
  type: "general_queries",
  name: "",
  designation: "",
  email: "",
  telephone: "",
});

const emptyHeadOfficeAddress = (): HeadOfficeAddressBlock => ({
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  phone: "",
  fax: "",
});

const emptyTaxRegistration = (): TaxRegistrationBlock => ({
  tax_registration_nos: "",
  tin_no: "",
  cst_no: "",
  lst_no: "",
  esic_reg_no: "",
  pan_ref_no: "",
  ppf_no: "",
});

const emptyForm = (): ManualFormState => ({
  title: "",
  vendor_name: "",
  vendor_type: "",
  email: "",
  phone: "",
  gst_registered: false,
  gstin: "",
  pan: "",
  address_line1: "",
  address_line2: "",
  address_line3: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  region: "",
  head_office_no: "",
  fax: "",
  preferred_payment_mode: "",
  beneficiary_name: "",
  bank_name: "",
  account_number: "",
  bank_account_type: "",
  ifsc: "",
  micr_code: "",
  neft_code: "",
  bank_branch_address_line1: "",
  bank_branch_address_line2: "",
  bank_branch_city: "",
  bank_branch_state: "",
  bank_branch_country: "India",
  bank_branch_pincode: "",
  bank_phone: "",
  bank_fax: "",
  contact_persons: [emptyContactPerson(), emptyContactPerson()],
  head_office_address: emptyHeadOfficeAddress(),
  tax_registration_details: emptyTaxRegistration(),
  msme_registered: false,
  msme_registration_number: "",
  msme_enterprise_type: "",
  authorized_signatory_name: "",
  declaration_accepted: false,
});

type SectionKey = keyof ManualFormState;

// ── Build payload for submitManual ─────────────────────────────────────────────
// Produces the flat normalized + JSON block payload matching the backend contract.

function buildPayload(form: ManualFormState): {
  data: Record<string, unknown>;
  finalize: boolean;
} {
  const normalized: Record<string, unknown> = {
    title: form.title,
    vendor_name: form.vendor_name,
    vendor_type: form.vendor_type,
    email: form.email,
    phone: form.phone,
    fax: form.fax,
    gst_registered: form.gst_registered,
    gstin: form.gstin,
    pan: form.pan,
    region: form.region,
    head_office_no: form.head_office_no,
    address_line1: form.address_line1,
    address_line2: form.address_line2,
    address_line3: form.address_line3,
    city: form.city,
    state: form.state,
    country: form.country,
    pincode: form.pincode,
    preferred_payment_mode: form.preferred_payment_mode,
    beneficiary_name: form.beneficiary_name,
    bank_name: form.bank_name,
    account_number: form.account_number,
    bank_account_type: form.bank_account_type,
    ifsc: form.ifsc,
    micr_code: form.micr_code,
    neft_code: form.neft_code,
    bank_branch_address_line1: form.bank_branch_address_line1,
    bank_branch_address_line2: form.bank_branch_address_line2,
    bank_branch_city: form.bank_branch_city,
    bank_branch_state: form.bank_branch_state,
    bank_branch_country: form.bank_branch_country,
    bank_branch_pincode: form.bank_branch_pincode,
    bank_phone: form.bank_phone,
    bank_fax: form.bank_fax,
    authorized_signatory_name: form.authorized_signatory_name,
    msme_registered: form.msme_registered,
    msme_registration_number: form.msme_registration_number,
    msme_enterprise_type: form.msme_enterprise_type,
    declaration_accepted: form.declaration_accepted,
    // JSON blocks
    contact_persons: form.contact_persons.filter(
      (cp) => cp.name.trim() || cp.email.trim()
    ),
    head_office_address: form.head_office_address,
    tax_registration_details: form.tax_registration_details,
  };

  return { data: normalized, finalize: false };
}

// ── Invalid token screen ───────────────────────────────────────────────────────

function InvalidTokenScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-sm w-full text-center">
        <CardContent className="pt-6">
          <XCircle className="w-14 h-14 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid Invitation</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Manual form step ───────────────────────────────────────────────────────────

function ManualStep({
  invitation,
  initialSubmission,
  onSubmit,
  isPending,
  error,
}: {
  invitation: VendorInvitation;
  initialSubmission?: VendorOnboardingSubmission | null;
  onSubmit: (payload: { data: Record<string, unknown>; finalize: boolean }) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<ManualFormState>(emptyForm());
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from existing draft on mount — guard prevents clobbering user edits after initial load
  useEffect(() => {
    if (hydrated || !initialSubmission) return;
    const s = initialSubmission;
    setForm({
      title: s.normalized_title ?? "",
      vendor_name: s.normalized_vendor_name ?? "",
      vendor_type: s.normalized_vendor_type ?? "",
      email: s.normalized_email ?? "",
      phone: s.normalized_phone ?? "",
      gst_registered: s.normalized_gst_registered ?? false,
      gstin: s.normalized_gstin ?? "",
      pan: s.normalized_pan ?? "",
      address_line1: s.normalized_address_line1 ?? "",
      address_line2: s.normalized_address_line2 ?? "",
      address_line3: s.normalized_address_line3 ?? "",
      city: s.normalized_city ?? "",
      state: s.normalized_state ?? "",
      country: s.normalized_country ?? "India",
      pincode: s.normalized_pincode ?? "",
      region: s.normalized_region ?? "",
      head_office_no: s.normalized_head_office_no ?? "",
      fax: s.normalized_fax ?? "",
      preferred_payment_mode: s.normalized_preferred_payment_mode ?? "",
      beneficiary_name: s.normalized_beneficiary_name ?? "",
      bank_name: s.normalized_bank_name ?? "",
      account_number: s.normalized_account_number ?? "",
      bank_account_type: s.normalized_bank_account_type ?? "",
      ifsc: s.normalized_ifsc ?? "",
      micr_code: s.normalized_micr_code ?? "",
      neft_code: s.normalized_neft_code ?? "",
      bank_branch_address_line1: s.normalized_bank_branch_address_line1 ?? "",
      bank_branch_address_line2: s.normalized_bank_branch_address_line2 ?? "",
      bank_branch_city: s.normalized_bank_branch_city ?? "",
      bank_branch_state: s.normalized_bank_branch_state ?? "",
      bank_branch_country: s.normalized_bank_branch_country ?? "India",
      bank_branch_pincode: s.normalized_bank_branch_pincode ?? "",
      bank_phone: s.normalized_bank_phone ?? "",
      bank_fax: s.normalized_bank_fax ?? "",
      contact_persons: hydrateContactPersons(s.contact_persons_json),
      head_office_address: {
        address_line1: s.head_office_address_json?.address_line1 ?? "",
        address_line2: s.head_office_address_json?.address_line2 ?? "",
        city: s.head_office_address_json?.city ?? "",
        state: s.head_office_address_json?.state ?? "",
        country: s.head_office_address_json?.country ?? "India",
        pincode: s.head_office_address_json?.pincode ?? "",
        phone: s.head_office_address_json?.phone ?? "",
        fax: s.head_office_address_json?.fax ?? "",
      },
      tax_registration_details: {
        tax_registration_nos: s.tax_registration_details_json?.tax_registration_nos ?? "",
        tin_no: s.tax_registration_details_json?.tin_no ?? "",
        cst_no: s.tax_registration_details_json?.cst_no ?? "",
        lst_no: s.tax_registration_details_json?.lst_no ?? "",
        esic_reg_no: s.tax_registration_details_json?.esic_reg_no ?? "",
        pan_ref_no: s.tax_registration_details_json?.pan_ref_no ?? "",
        ppf_no: s.tax_registration_details_json?.ppf_no ?? "",
      },
      msme_registered: s.normalized_msme_registered ?? false,
      msme_registration_number: s.normalized_msme_registration_number ?? "",
      msme_enterprise_type: (s.normalized_msme_enterprise_type as ManualFormState["msme_enterprise_type"]) ?? "",
      authorized_signatory_name: s.normalized_authorized_signatory_name ?? "",
      declaration_accepted: s.declaration_accepted ?? false,
    });
    setHydrated(true);
  }, [initialSubmission, hydrated]);

  function hydrateContactPersons(
    cps: ContactPerson[] | null,
  ): [ContactPersonEntry, ContactPersonEntry] {
    const rows = (cps ?? [])
      .filter((cp) => cp.name?.trim() || cp.email?.trim())
      .slice(0, 2);
    while (rows.length < 2) rows.push(emptyContactPerson());
    return rows as [ContactPersonEntry, ContactPersonEntry];
  }

  const set = <K extends SectionKey>(key: K, value: ManualFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const setContactPerson = (idx: number, field: keyof ContactPersonEntry, value: string) => {
    setForm((f) => {
      const updated = [...f.contact_persons] as [ContactPersonEntry, ContactPersonEntry];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...f, contact_persons: updated };
    });
  };

  const setHeadOffice = <K extends keyof HeadOfficeAddressBlock>(key: K, value: string) => {
    setForm((f) => ({
      ...f,
      head_office_address: { ...f.head_office_address, [key]: value },
    }));
  };

  const setTaxReg = <K extends keyof TaxRegistrationBlock>(key: K, value: string) => {
    setForm((f) => ({
      ...f,
      tax_registration_details: { ...f.tax_registration_details, [key]: value },
    }));
  };

  const handleSubmit = (submitAsFinalize: boolean) => {
    if (submitAsFinalize && !form.declaration_accepted) return;
    const payload = buildPayload(form);
    payload.finalize = submitAsFinalize;
    onSubmit(payload);
  };

  return (
    <div className="space-y-5">

      {/* Invitation context */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <p className="text-sm">
          Invitation for <strong>{invitation.vendor_email}</strong>
          {invitation.vendor_name_hint && (
            <span> — {invitation.vendor_name_hint}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Scope: {invitation.scope_node_name}
        </p>
      </div>

      {/* ── SECTION 1: BUSINESS DETAILS ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 1 — Business Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Select value={form.title} onValueChange={(v) => set("title", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Company">Company</SelectItem>
                  <SelectItem value="Proprietorship">Proprietorship</SelectItem>
                  <SelectItem value="Partnership">Partnership</SelectItem>
                  <SelectItem value="LLP">LLP</SelectItem>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="vendor_name">Vendor Name *</Label>
              <Input
                id="vendor_name"
                value={form.vendor_name}
                onChange={(e) => set("vendor_name", e.target.value)}
                placeholder="Registered company name as per records"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vendor_type">Vendor Type *</Label>
              <Select value={form.vendor_type} onValueChange={(v) => set("vendor_type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Supplier">Supplier</SelectItem>
                  <SelectItem value="Agency">Agency</SelectItem>
                  <SelectItem value="Contractor">Contractor</SelectItem>
                  <SelectItem value="Consultant">Consultant</SelectItem>
                  <SelectItem value="Stockiest">Stockiest</SelectItem>
                  <SelectItem value="Channel Partner">Channel Partner</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="contact@company.com"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                placeholder="e.g. West, East, North, South"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="head_office_no">Head Office / Site No.</Label>
              <Input
                id="head_office_no"
                value={form.head_office_no}
                onChange={(e) => set("head_office_no", e.target.value)}
                placeholder="e.g. HO-001"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="gst_registered"
              checked={form.gst_registered}
              onChange={(e) => set("gst_registered", e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="gst_registered" className="text-sm font-normal">
              GST Registered
            </Label>
          </div>

          {form.gst_registered && (
            <div className="space-y-1">
              <Label htmlFor="gstin">GSTIN *</Label>
              <Input
                id="gstin"
                value={form.gstin}
                onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                placeholder="27AAACZ1234F1Z5"
                maxLength={15}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="pan">PAN *</Label>
            <Input
              id="pan"
              value={form.pan}
              onChange={(e) => set("pan", e.target.value.toUpperCase())}
              placeholder="AAAPL1234C"
              maxLength={10}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: BILLING ADDRESS ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 2 — Billing Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Address Line 1 *</Label>
            <Input
              value={form.address_line1}
              onChange={(e) => set("address_line1", e.target.value)}
              placeholder="Street / area address"
            />
          </div>
          <div className="space-y-1">
            <Label>Address Line 2</Label>
            <Input
              value={form.address_line2}
              onChange={(e) => set("address_line2", e.target.value)}
              placeholder="Building / floor / locality"
            />
          </div>
          <div className="space-y-1">
            <Label>Address Line 3</Label>
            <Input
              value={form.address_line3}
              onChange={(e) => set("address_line3", e.target.value)}
              placeholder="Additional address info"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>City *</Label>
              <Input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Mumbai"
              />
            </div>
            <div className="space-y-1">
              <Label>State *</Label>
              <Input
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                placeholder="Maharashtra"
              />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Pincode *</Label>
              <Input
                value={form.pincode}
                onChange={(e) => set("pincode", e.target.value)}
                placeholder="400001"
              />
            </div>
            <div className="space-y-1">
              <Label>Fax</Label>
              <Input
                value={form.fax}
                onChange={(e) => set("fax", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 3: PAYMENT DETAILS ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 3 — Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Preferred Payment Mode</Label>
            <Select value={form.preferred_payment_mode} onValueChange={(v) => set("preferred_payment_mode", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RTGS">RTGS</SelectItem>
                <SelectItem value="NEFT">NEFT</SelectItem>
                <SelectItem value="IMPS">IMPS</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="LC">Letter of Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Beneficiary Name *</Label>
              <Input
                value={form.beneficiary_name}
                onChange={(e) => set("beneficiary_name", e.target.value)}
                placeholder="Name as per bank records"
              />
            </div>
            <div className="space-y-1">
              <Label>Bank Name *</Label>
              <Input
                value={form.bank_name}
                onChange={(e) => set("bank_name", e.target.value)}
                placeholder="e.g. HDFC Bank"
              />
            </div>
            <div className="space-y-1">
              <Label>Account Number *</Label>
              <Input
                value={form.account_number}
                onChange={(e) => set("account_number", e.target.value)}
                placeholder="1234567890"
              />
            </div>
            <div className="space-y-1">
              <Label>Account Type</Label>
              <Select value={form.bank_account_type} onValueChange={(v) => set("bank_account_type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Current">Current</SelectItem>
                  <SelectItem value="OD">Overdraft (OD)</SelectItem>
                  <SelectItem value="CC">Cash Credit (CC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>IFSC Code *</Label>
              <Input
                value={form.ifsc}
                onChange={(e) => set("ifsc", e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
              />
            </div>
            <div className="space-y-1">
              <Label>MICR Code</Label>
              <Input
                value={form.micr_code}
                onChange={(e) => set("micr_code", e.target.value)}
                placeholder="400123456"
              />
            </div>
            <div className="space-y-1">
              <Label>NEFT Code</Label>
              <Input
                value={form.neft_code}
                onChange={(e) => set("neft_code", e.target.value)}
                placeholder="NEFT code"
              />
            </div>
          </div>

          {/* Bank branch contact */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 pb-1">
            Bank Branch Contact
          </p>
          <div className="space-y-1">
            <Label>Branch Address Line 1</Label>
            <Input
              value={form.bank_branch_address_line1}
              onChange={(e) => set("bank_branch_address_line1", e.target.value)}
              placeholder="Street / area"
            />
          </div>
          <div className="space-y-1">
            <Label>Branch Address Line 2</Label>
            <Input
              value={form.bank_branch_address_line2}
              onChange={(e) => set("bank_branch_address_line2", e.target.value)}
              placeholder="Building / floor"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Branch City</Label>
              <Input
                value={form.bank_branch_city}
                onChange={(e) => set("bank_branch_city", e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-1">
              <Label>Branch State</Label>
              <Input
                value={form.bank_branch_state}
                onChange={(e) => set("bank_branch_state", e.target.value)}
                placeholder="State"
              />
            </div>
            <div className="space-y-1">
              <Label>Branch Country</Label>
              <Input
                value={form.bank_branch_country}
                onChange={(e) => set("bank_branch_country", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Branch Pincode</Label>
              <Input
                value={form.bank_branch_pincode}
                onChange={(e) => set("bank_branch_pincode", e.target.value)}
                placeholder="400001"
              />
            </div>
            <div className="space-y-1">
              <Label>Branch Phone</Label>
              <Input
                value={form.bank_phone}
                onChange={(e) => set("bank_phone", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
            <div className="space-y-1">
              <Label>Branch Fax</Label>
              <Input
                value={form.bank_fax}
                onChange={(e) => set("bank_fax", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 4: CONTACT PERSONS ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 4 — Contact Persons
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.contact_persons.map((cp, idx) => (
            <div key={idx} className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Contact {idx + 1}
                <span className="ml-2 normal-case font-normal">
                  ({cp.type === "general_queries" ? "General Queries" : "Secondary"})
                </span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input
                    value={cp.name}
                    onChange={(e) => setContactPerson(idx, "name", e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Designation</Label>
                  <Input
                    value={cp.designation}
                    onChange={(e) => setContactPerson(idx, "designation", e.target.value)}
                    placeholder="e.g. Finance Manager"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={cp.email}
                    onChange={(e) => setContactPerson(idx, "email", e.target.value)}
                    placeholder="contact@company.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Telephone</Label>
                  <Input
                    value={cp.telephone}
                    onChange={(e) => setContactPerson(idx, "telephone", e.target.value)}
                    placeholder="+91 ..."
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── SECTION 5: HEAD OFFICE ADDRESS ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 5 — Head Office Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Address Line 1</Label>
            <Input
              value={form.head_office_address.address_line1}
              onChange={(e) => setHeadOffice("address_line1", e.target.value)}
              placeholder="Street / area address"
            />
          </div>
          <div className="space-y-1">
            <Label>Address Line 2</Label>
            <Input
              value={form.head_office_address.address_line2}
              onChange={(e) => setHeadOffice("address_line2", e.target.value)}
              placeholder="Building / floor / locality"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>City</Label>
              <Input
                value={form.head_office_address.city}
                onChange={(e) => setHeadOffice("city", e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-1">
              <Label>State</Label>
              <Input
                value={form.head_office_address.state}
                onChange={(e) => setHeadOffice("state", e.target.value)}
                placeholder="State"
              />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input
                value={form.head_office_address.country}
                onChange={(e) => setHeadOffice("country", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Pincode</Label>
              <Input
                value={form.head_office_address.pincode}
                onChange={(e) => setHeadOffice("pincode", e.target.value)}
                placeholder="400001"
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={form.head_office_address.phone}
                onChange={(e) => setHeadOffice("phone", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
            <div className="space-y-1">
              <Label>Fax</Label>
              <Input
                value={form.head_office_address.fax}
                onChange={(e) => setHeadOffice("fax", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 6: TAX REGISTRATION DETAILS ─────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 6 — Tax Registration Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tax Registration Nos.</Label>
              <Input
                value={form.tax_registration_details.tax_registration_nos}
                onChange={(e) => setTaxReg("tax_registration_nos", e.target.value)}
                placeholder="Tax registration numbers"
              />
            </div>
            <div className="space-y-1">
              <Label>TIN No.</Label>
              <Input
                value={form.tax_registration_details.tin_no}
                onChange={(e) => setTaxReg("tin_no", e.target.value)}
                placeholder="TIN"
              />
            </div>
            <div className="space-y-1">
              <Label>CST No.</Label>
              <Input
                value={form.tax_registration_details.cst_no}
                onChange={(e) => setTaxReg("cst_no", e.target.value)}
                placeholder="CST"
              />
            </div>
            <div className="space-y-1">
              <Label>LST No.</Label>
              <Input
                value={form.tax_registration_details.lst_no}
                onChange={(e) => setTaxReg("lst_no", e.target.value)}
                placeholder="LST"
              />
            </div>
            <div className="space-y-1">
              <Label>ESIC Reg. No.</Label>
              <Input
                value={form.tax_registration_details.esic_reg_no}
                onChange={(e) => setTaxReg("esic_reg_no", e.target.value)}
                placeholder="ESIC"
              />
            </div>
            <div className="space-y-1">
              <Label>PAN Ref. No.</Label>
              <Input
                value={form.tax_registration_details.pan_ref_no}
                onChange={(e) => setTaxReg("pan_ref_no", e.target.value)}
                placeholder="PAN Ref"
              />
            </div>
            <div className="space-y-1">
              <Label>PPF No.</Label>
              <Input
                value={form.tax_registration_details.ppf_no}
                onChange={(e) => setTaxReg("ppf_no", e.target.value)}
                placeholder="PPF"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 7: MSME DECLARATION ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 7 — MSME Declaration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="msme_registered"
              checked={form.msme_registered}
              onChange={(e) => set("msme_registered", e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="msme_registered" className="text-sm font-normal">
              MSME Registered
            </Label>
          </div>

          {form.msme_registered && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>MSME Registration Number</Label>
                <Input
                  value={form.msme_registration_number}
                  onChange={(e) => set("msme_registration_number", e.target.value)}
                  placeholder="UDYAM-XX-XXXX-XXXXX"
                />
              </div>
              <div className="space-y-1">
                <Label>Enterprise Type</Label>
                <Select
                  value={form.msme_enterprise_type}
                  onValueChange={(v) => set("msme_enterprise_type", v as "micro" | "small" | "medium" | "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="micro">Micro</SelectItem>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>Authorized Signatory Name</Label>
            <Input
              value={form.authorized_signatory_name}
              onChange={(e) => set("authorized_signatory_name", e.target.value)}
              placeholder="Full name of authorized signatory"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── DECLARATION CARD ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Declaration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            <p>
              I/We hereby declare that the information provided above is true and correct
              to the best of my/our knowledge. I/We undertake to inform any changes
              therein to the organization promptly. I/We agree to comply with the
              organization&apos;s terms and conditions and any subsequent amendments thereto.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="declaration_accepted"
              checked={form.declaration_accepted}
              onChange={(e) => set("declaration_accepted", e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="declaration_accepted" className="text-sm font-normal">
              I confirm that the information provided is accurate and I am authorized to submit this form on behalf of the organization.
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* ── Submit actions ────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={isPending}
          className="flex-1"
        >
          {isPending ? (
            <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving...</>
          ) : "Save Draft"}
        </Button>
        <Button
          onClick={() => handleSubmit(true)}
          disabled={isPending || !form.declaration_accepted}
          className="flex-1"
        >
          {isPending ? (
            <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Submitting...</>
          ) : (
            <><Send className="mr-1.5 h-4 w-4" /> Submit & Finalize</>
          )}
        </Button>
      </div>
      {!form.declaration_accepted && (
        <p className="text-xs text-center text-muted-foreground">
          Please confirm the declaration above to submit.
        </p>
      )}
    </div>
  );
}

// ── Excel upload step ─────────────────────────────────────────────────────────

function ExcelStep({
  invitation,
  onUpload,
  isPending,
  error,
}: {
  invitation: VendorInvitation;
  onUpload: (file: File, finalize: boolean) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [finalize, setFinalize] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm">
          Invitation for <strong>{invitation.vendor_email}</strong>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Scope: {invitation.scope_node_name}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upload VRF Workbook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a completed Vendor Registration Form (VRF) workbook in .xlsx format.
            The workbook will be parsed and vendor data extracted automatically.
          </p>
          {file ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 px-6 py-10 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors bg-secondary/20">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Click to browse or drag VRF workbook here
              </span>
              <span className="text-xs text-muted-foreground">.xlsx</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
            </label>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="excel-finalize"
          checked={finalize}
          onChange={(e) => setFinalize(e.target.checked)}
          className="rounded border-border"
        />
        <Label htmlFor="excel-finalize" className="text-sm font-normal">
          Finalize immediately after upload
        </Label>
      </div>

      <Button
        onClick={() => file && onUpload(file, finalize)}
        disabled={!file || isPending}
        className="w-full"
      >
        {isPending ? (
          <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Processing...</>
        ) : (
          <><Upload className="mr-1.5 h-4 w-4" /> Upload & {finalize ? "Finalize" : "Save Draft"}</>
        )}
      </Button>
    </div>
  );
}

// ── Attachments step ──────────────────────────────────────────────────────────

const ATTACHMENT_DOC_TYPES = [
  { value: "msme_declaration_form", label: "MSME Declaration Form" },
  { value: "msme_registration_certificate", label: "MSME Registration Certificate (UDYAM)" },
  { value: "cancelled_cheque", label: "Cancelled Cheque" },
  { value: "pan_copy", label: "PAN Copy" },
  { value: "gst_certificate", label: "GST Certificate" },
  { value: "bank_proof", label: "Bank Proof / Statement" },
  { value: "supporting_document", label: "Supporting Document" },
];

function AttachmentsStep({
  onAdd,
  attachments,
  onRemove,
  onFinalize,
  isAdding,
  isFinalizing,
  error,
}: {
  attachments: { title: string; file_name: string; document_type: string }[];
  onAdd: (file: File, title: string, documentType: string) => void;
  onRemove: (idx: number) => void;
  onFinalize: () => void;
  isAdding: boolean;
  isFinalizing: boolean;
  error: string | null;
}) {
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleAdd = () => {
    if (!title.trim()) { setLocalError("Title is required."); return; }
    if (!file) { setLocalError("Please select a file."); return; }
    if (!docType) { setLocalError("Please select a document type."); return; }
    setLocalError(null);
    onAdd(file, title.trim(), docType);
    setTitle("");
    setDocType("");
    setFile(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Supporting Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Attach supporting documents such as GST Certificate, PAN Card, Bank Letter,
            or MSME Certificate. Accepted: PDF, JPG, PNG, Excel, Word (max 10 MB each).
          </p>

          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-secondary/20"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{att.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {att.document_type || "Uncategorized"} — {att.file_name}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(i)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* File picker */}
          {file ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 px-6 py-8 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors bg-secondary/20">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to select document file</span>
              <span className="text-xs text-muted-foreground">PDF, JPG, PNG, XLSX, DOC, CSV — max 10 MB</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx,.txt,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^/.]+$/, "")); }
                }}
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. GST Certificate"
              />
            </div>
            <div className="space-y-1">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ATTACHMENT_DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {localError && (
            <p className="text-sm text-destructive">{localError}</p>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={!file || !title.trim() || !docType || isAdding}
            className="gap-1.5"
          >
            {isAdding ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</>
            ) : (
              <><Plus className="h-3.5 w-3.5" /> Upload Attachment</>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onFinalize}
          disabled={isFinalizing}
          className="flex-1"
        >
          {isFinalizing ? (
            <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Finalizing...</>
          ) : (
            <><CheckCircle2 className="mr-1.5 h-4 w-4" /> Finalize Submission</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Submitted confirmation ────────────────────────────────────────────────────

function SubmittedScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Submission Received — Finance Review Started</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your vendor registration has been submitted and has automatically entered finance review.
            Our finance team will review your details and may approve or request changes.
            You will be notified by email with the outcome.
          </p>
          <div className="p-4 rounded-lg bg-secondary/30 text-left space-y-1 text-sm text-muted-foreground">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">What happens next</p>
            <p>• Our finance team is reviewing your submission automatically</p>
            <p>• You&apos;ll receive an email if they need more information or have approved your registration</p>
            <p>• If approved, your vendor account will move to the activation stage and you&apos;ll be notified</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Mode = "loading" | "manual" | "excel" | "attachments" | "submitted";

export default function VendorOnboardingPage() {
  const { token } = useParams<{ token: string }>();

  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ["v2", "vendor", "public", "invitation", token],
    queryFn: () => getPublicInvitation(token!),
    retry: false,
  });

  const [mode, setMode] = useState<Mode>("loading");
  const [attachments, setAttachments] = useState<
    { title: string; file_name: string; document_type: string }[]
  >([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentSubmission, setCurrentSubmission] = useState<VendorOnboardingSubmission | null>(null);

  // Fetch existing draft when entering manual mode
  useEffect(() => {
    if (mode !== "manual" || !token) return;
    getPublicSubmission(token)
      .then((s) => setCurrentSubmission(s))
      .catch(() => setCurrentSubmission(null));
  }, [mode, token]);

  const submitManualMutation = useMutation({
    mutationFn: (payload: { data: Record<string, unknown>; finalize: boolean }) =>
      submitManual(token!, payload),
  });

  const submitExcelMutation = useMutation({
    mutationFn: ({ file, finalize }: { file: File; finalize: boolean }) =>
      submitExcel(token!, file, finalize),
  });

  const addAttachmentMutation = useMutation({
    mutationFn: ({ file, title, documentType }: { file: File; title: string; documentType: string }) =>
      addAttachment(token!, file, title, documentType),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeInvitation(token!),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validating invitation…</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <InvalidTokenScreen
        message={
          error instanceof ApiError
            ? error.message
            : "This invitation link is invalid or has expired."
        }
      />
    );
  }

  if (invitation.status === "cancelled" || invitation.status === "expired") {
    return (
      <InvalidTokenScreen
        message={`This invitation is ${invitation.status}. Please contact the organization for a new invitation.`}
      />
    );
  }

  if (invitation.status === "submitted") {
    return <SubmittedScreen />;
  }

  // Mode selection screen
  if (mode === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-bold text-sm">IF</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Vendor Onboarding</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Invitation for <strong>{invitation.vendor_email}</strong>
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose how you would like to complete the Vendor Registration Form (VRF).
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => setMode("manual")}
                  className="w-full justify-start text-left h-auto py-4"
                  variant="outline"
                >
                  <div className="flex items-start gap-3 w-full">
                    <FileText className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Fill Form Manually</p>
                      <p className="text-xs text-muted-foreground">
                        Complete the VRF as an online form — same fields as the workbook
                      </p>
                    </div>
                  </div>
                </Button>
                <Button
                  onClick={() => setMode("excel")}
                  className="w-full justify-start text-left h-auto py-4"
                  variant="outline"
                >
                  <div className="flex items-start gap-3 w-full">
                    <Upload className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Upload VRF Workbook</p>
                      <p className="text-xs text-muted-foreground">
                        Submit a pre-filled vendor registration workbook (.xlsx)
                      </p>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Manual submission
  if (mode === "manual") {
    return (
      <div className="min-h-screen bg-background p-4">
        <ScrollArea className="max-w-2xl mx-auto">
          <div className="py-6 space-y-6">
            <div className="flex items-center justify-between px-1">
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Vendor Registration Form
                </h1>
                <p className="text-sm text-muted-foreground">
                  {invitation.vendor_email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode("loading")}
                className="gap-1"
              >
                ← Change submission method
              </Button>
            </div>

            <ManualStep
              invitation={invitation}
              initialSubmission={currentSubmission}
              onSubmit={(payload) => {
                setSubmitError(null);
                submitManualMutation.mutate(payload, {
                  onSuccess: (data) => {
                    setCurrentSubmission(data);
                    if (payload.finalize) {
                      setMode("submitted");
                    } else {
                      setMode("attachments");
                    }
                  },
                  onError: (err) => {
                    setSubmitError(generalApiError(err) ?? "Submission failed");
                  },
                });
              }}
              isPending={submitManualMutation.isPending}
              error={submitError}
            />

            {submitManualMutation.isSuccess && (
              <Button
                variant="outline"
                onClick={() => setMode("attachments")}
                className="w-full gap-1.5"
              >
                <Link2 className="h-4 w-4" /> Add Attachments →
              </Button>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Excel submission
  if (mode === "excel") {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Vendor Registration — VRF Upload
              </h1>
              <p className="text-sm text-muted-foreground">
                {invitation.vendor_email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("loading")}
              className="gap-1"
            >
              ← Change submission method
            </Button>
          </div>

          <ExcelStep
            invitation={invitation}
            onUpload={(file, doFinalize) => {
              setSubmitError(null);
              submitExcelMutation.mutate(
                { file, finalize: doFinalize },
                {
                  onSuccess: () => {
                    if (doFinalize) {
                      setMode("submitted");
                    } else {
                      setMode("attachments");
                    }
                  },
                  onError: (err) => {
                    setSubmitError(generalApiError(err) ?? "Upload failed");
                  },
                },
              );
            }}
            isPending={submitExcelMutation.isPending}
            error={submitError}
          />
        </div>
      </div>
    );
  }

  // Attachments step
  if (mode === "attachments") {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Add Attachments</h1>
            <p className="text-sm text-muted-foreground">
              {invitation.vendor_email}
            </p>
          </div>

          <AttachmentsStep
            attachments={attachments}
            onAdd={(file, title, documentType) => {
              setSubmitError(null);
              addAttachmentMutation.mutate({ file, title, documentType }, {
                onSuccess: () => {
                  setAttachments((prev) => [...prev, {
                    title,
                    file_name: file.name,
                    document_type: documentType,
                  }]);
                },
                onError: (err) => {
                  setSubmitError(generalApiError(err) ?? "Failed to upload attachment");
                },
              });
            }}
            onRemove={(idx) =>
              setAttachments((prev) => prev.filter((_, i) => i !== idx))
            }
            onFinalize={() => {
              setSubmitError(null);
              finalizeMutation.mutate(undefined, {
                onSuccess: () => setMode("submitted"),
                onError: (err) => {
                  setSubmitError(generalApiError(err) ?? "Failed to finalize");
                },
              });
            }}
            isAdding={addAttachmentMutation.isPending}
            isFinalizing={finalizeMutation.isPending}
            error={submitError}
          />

          <Button
            variant="outline"
            onClick={() => {
              setSubmitError(null);
              finalizeMutation.mutate(undefined, {
                onSuccess: () => setMode("submitted"),
                onError: (err) => {
                  setSubmitError(generalApiError(err) ?? "Failed to finalize");
                },
              });
            }}
            disabled={finalizeMutation.isPending}
            className="w-full"
          >
            {finalizeMutation.isPending ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Finalizing...</>
            ) : "Skip attachments and finalize →"}
          </Button>
        </div>
      </div>
    );
  }

  return <SubmittedScreen />;
}
