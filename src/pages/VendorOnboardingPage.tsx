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

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getPublicInvitation,
  submitManual,
  submitExcel,
  addAttachment,
  finalizeInvitation,
} from "@/lib/api/v2vendor";
import type { VendorInvitation } from "@/lib/types/v2vendor";
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
  Info,
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

// ── Section components ─────────────────────────────────────────────────────────

/** Read-only informational field block (for internal/requestor/sap sections) */
function InfoBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-muted-foreground/80 italic">
        {value || "—"}
      </p>
    </div>
  );
}

/** Internal/read-only notice banner for sections vendor should not edit */
function InternalNotice({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

// ── Form state interfaces (mirrors VRF workbook sections) ─────────────────────

interface VrfData {
  // Section 2: Registration / Tax Details
  tds_section: string;
  tds_exemption_applicable: string;
  tds_exemption_threshold: string;
  msme_registered: string;
  msme_type: string;
  // Section 3: Billing / Supply Address
  billing_address_line1: string;
  billing_address_line2: string;
  billing_city: string;
  billing_state: string;
  billing_pincode: string;
  billing_country: string;
  billing_phone: string;
  billing_fax: string;
  // Section 4: Head Office / Registered Office Address
  registered_address_line1: string;
  registered_address_line2: string;
  registered_city: string;
  registered_state: string;
  registered_pincode: string;
  registered_country: string;
  registered_phone: string;
  registered_fax: string;
  // Section 5: Contact Person Details
  contact_person_name: string;
  contact_person_designation: string;
  contact_person_email: string;
  contact_person_phone: string;
  contact_person_mobile: string;
  contact_person_fax: string;
  // Section 6: Bank / Payment Details
  bank_branch_name: string;
  bank_branch_address: string;
  bank_account_type: string;
  rtgs_neft_enabled: string;
  micr_code: string;
  payment_terms: string;
  currency: string;
  bank_guarantee_required: string;
  bank_guarantee_amount: string;
  importer_exporter_code: string;
  // Section 7: Internal / Requestor (filled by internal team)
  requestor_name: string;
  requestor_department: string;
  requestor_email: string;
  requestor_phone: string;
  requestor_date: string;
  // Section 8: Company / Purchasing / SAP (filled by internal team)
  sap_vendor_code: string;
  company_code: string;
  purchase_group: string;
  purchasing_org: string;
  purchase_make: string;
  // Section 9: Approver Block (filled by internal team)
  approver_name: string;
  approver_designation: string;
  approver_department: string;
  approver_email: string;
  // Section 10: Declaration
  authorized_signatory_name: string;
  authorized_signatory_designation: string;
  authorized_signatory_date: string;
  place: string;
}

interface ManualFormState {
  // Section 1: Vendor Basic Details
  vendor_name: string;
  vendor_type: string;
  stockiest: string;
  email: string;
  phone: string;
  website: string;
  // Tax
  gst_registered: string;
  gstin: string;
  pan: string;
  // Section 3 (primary address) — address_line1/2/city/state/pincode/country stored as normalized
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  address_phone: string;
  address_fax: string;
  // Section 6: Bank
  bank_name: string;
  account_number: string;
  ifsc: string;
  // vrf_sections: all other VRF fields grouped as in the workbook
  vrf_sections: VrfData;
}

const emptyVrf = (): VrfData => ({
  tds_section: "",
  tds_exemption_applicable: "",
  tds_exemption_threshold: "",
  msme_registered: "",
  msme_type: "",
  billing_address_line1: "",
  billing_address_line2: "",
  billing_city: "",
  billing_state: "",
  billing_pincode: "",
  billing_country: "India",
  billing_phone: "",
  billing_fax: "",
  registered_address_line1: "",
  registered_address_line2: "",
  registered_city: "",
  registered_state: "",
  registered_pincode: "",
  registered_country: "India",
  registered_phone: "",
  registered_fax: "",
  contact_person_name: "",
  contact_person_designation: "",
  contact_person_email: "",
  contact_person_phone: "",
  contact_person_mobile: "",
  contact_person_fax: "",
  bank_branch_name: "",
  bank_branch_address: "",
  bank_account_type: "",
  rtgs_neft_enabled: "",
  micr_code: "",
  payment_terms: "",
  currency: "INR",
  bank_guarantee_required: "",
  bank_guarantee_amount: "",
  importer_exporter_code: "",
  requestor_name: "",
  requestor_department: "",
  requestor_email: "",
  requestor_phone: "",
  requestor_date: "",
  sap_vendor_code: "",
  company_code: "",
  purchase_group: "",
  purchasing_org: "",
  purchase_make: "",
  approver_name: "",
  approver_designation: "",
  approver_department: "",
  approver_email: "",
  authorized_signatory_name: "",
  authorized_signatory_designation: "",
  authorized_signatory_date: "",
  place: "",
});

const emptyForm = (): ManualFormState => ({
  vendor_name: "",
  vendor_type: "",
  stockiest: "",
  email: "",
  phone: "",
  website: "",
  gst_registered: "",
  gstin: "",
  pan: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  address_phone: "",
  address_fax: "",
  bank_name: "",
  account_number: "",
  ifsc: "",
  vrf_sections: emptyVrf(),
});

type SectionKey = keyof ManualFormState | `vrf_sections.${keyof VrfData}`;

// ── Build payload for submitManual ─────────────────────────────────────────────

function buildPayload(form: ManualFormState): {
  data: Record<string, unknown>;
  finalize: boolean;
} {
  // Top-level: normalized fields the backend extracts into dedicated columns
  const normalized: Record<string, unknown> = {
    vendor_name: form.vendor_name,
    vendor_type: form.vendor_type,
    email: form.email,
    phone: form.phone,
    gst_registered: form.gst_registered === "true" || form.gst_registered === "yes",
    gstin: form.gstin,
    pan: form.pan,
    address_line1: form.address_line1,
    address_line2: form.address_line2,
    city: form.city,
    state: form.state,
    country: form.country,
    pincode: form.pincode,
    bank_name: form.bank_name,
    account_number: form.account_number,
    ifsc: form.ifsc,
  };

  // VRF section structure — mirrors the VRF workbook
  const vrf_data = {
    // Section 1 extended
    stockiest: form.stockiest,
    website: form.website,
    // Section 2
    tax_registration: {
      tds_section: form.vrf_sections.tds_section,
      tds_exemption_applicable: form.vrf_sections.tds_exemption_applicable,
      tds_exemption_threshold: form.vrf_sections.tds_exemption_threshold,
      msme_registered: form.vrf_sections.msme_registered,
      msme_type: form.vrf_sections.msme_type,
    },
    // Section 3: Billing address
    billing_address: {
      address_line1: form.vrf_sections.billing_address_line1,
      address_line2: form.vrf_sections.billing_address_line2,
      city: form.vrf_sections.billing_city,
      state: form.vrf_sections.billing_state,
      pincode: form.vrf_sections.billing_pincode,
      country: form.vrf_sections.billing_country,
      phone: form.vrf_sections.billing_phone,
      fax: form.vrf_sections.billing_fax,
    },
    // Section 4: Registered/head office address
    registered_office_address: {
      address_line1: form.vrf_sections.registered_address_line1,
      address_line2: form.vrf_sections.registered_address_line2,
      city: form.vrf_sections.registered_city,
      state: form.vrf_sections.registered_state,
      pincode: form.vrf_sections.registered_pincode,
      country: form.vrf_sections.registered_country,
      phone: form.vrf_sections.registered_phone,
      fax: form.vrf_sections.registered_fax,
    },
    // Section 3 primary address extra
    primary_address_phone: form.address_phone,
    primary_address_fax: form.address_fax,
    // Section 5: Contact person
    contact_person: {
      name: form.vrf_sections.contact_person_name,
      designation: form.vrf_sections.contact_person_designation,
      email: form.vrf_sections.contact_person_email,
      phone: form.vrf_sections.contact_person_phone,
      mobile: form.vrf_sections.contact_person_mobile,
      fax: form.vrf_sections.contact_person_fax,
    },
    // Section 6 extended bank
    bank_details_extended: {
      bank_branch_name: form.vrf_sections.bank_branch_name,
      bank_branch_address: form.vrf_sections.bank_branch_address,
      bank_account_type: form.vrf_sections.bank_account_type,
      rtgs_neft_enabled: form.vrf_sections.rtgs_neft_enabled,
      micr_code: form.vrf_sections.micr_code,
      payment_terms: form.vrf_sections.payment_terms,
      currency: form.vrf_sections.currency,
      bank_guarantee_required: form.vrf_sections.bank_guarantee_required,
      bank_guarantee_amount: form.vrf_sections.bank_guarantee_amount,
      importer_exporter_code: form.vrf_sections.importer_exporter_code,
    },
    // Section 7: Internal requestor
    requestor: {
      name: form.vrf_sections.requestor_name,
      department: form.vrf_sections.requestor_department,
      email: form.vrf_sections.requestor_email,
      phone: form.vrf_sections.requestor_phone,
      date: form.vrf_sections.requestor_date,
    },
    // Section 8: Company / purchasing / SAP
    company_purchasing: {
      sap_vendor_code: form.vrf_sections.sap_vendor_code,
      company_code: form.vrf_sections.company_code,
      purchase_group: form.vrf_sections.purchase_group,
      purchasing_org: form.vrf_sections.purchasing_org,
      purchase_make: form.vrf_sections.purchase_make,
    },
    // Section 9: Approver
    approver: {
      name: form.vrf_sections.approver_name,
      designation: form.vrf_sections.approver_designation,
      department: form.vrf_sections.approver_department,
      email: form.vrf_sections.approver_email,
    },
    // Section 10: Declaration
    declaration: {
      authorized_signatory_name: form.vrf_sections.authorized_signatory_name,
      authorized_signatory_designation: form.vrf_sections.authorized_signatory_designation,
      authorized_signatory_date: form.vrf_sections.authorized_signatory_date,
      place: form.vrf_sections.place,
    },
  };

  return {
    data: { ...normalized, vrf_data },
    finalize: false,
  };
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
  onSubmit,
  isPending,
  error,
}: {
  invitation: VendorInvitation;
  onSubmit: (payload: { data: Record<string, unknown>; finalize: boolean }) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<ManualFormState>(emptyForm());
  const [doFinalize, setDoFinalize] = useState(false);
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);

  const set = <K extends SectionKey>(key: K, value: ManualFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const setVrf = <K extends keyof VrfData>(key: K, value: VrfData[K]) => {
    setForm((f) => ({
      ...f,
      vrf_sections: { ...f.vrf_sections, [key]: value },
    }));
  };

  const handleSubmit = (submitAsFinalize: boolean) => {
    if (submitAsFinalize && !declarationConfirmed) return;
    const payload = buildPayload(form);
    // Override finalize in the pre-built payload
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

      {/* ── SECTION 1: VENDOR BASIC DETAILS ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 1 — Vendor Basic Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="stockiest">Stockiest</Label>
              <Select value={form.stockiest} onValueChange={(v) => set("stockiest", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="NA">NA</SelectItem>
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
            <div className="col-span-2 space-y-1">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://www.company.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: REGISTRATION / TAX DETAILS ───────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 2 — Registration &amp; Tax Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="gst_registered"
              checked={form.gst_registered === "true"}
              onChange={(e) =>
                set("gst_registered", e.target.checked ? "true" : "")
              }
              className="rounded border-border"
            />
            <Label htmlFor="gst_registered" className="text-sm font-normal">
              GST Registered
            </Label>
          </div>

          {form.gst_registered === "true" && (
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="tds_section">TDS Section</Label>
              <Select value={form.vrf_sections.tds_section} onValueChange={(v) => setVrf("tds_section", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="194C">194C - Contractor</SelectItem>
                  <SelectItem value="194">194 - Dividend</SelectItem>
                  <SelectItem value="194A">194A - Interest</SelectItem>
                  <SelectItem value="194H">194H - Commission</SelectItem>
                  <SelectItem value="194I">194I - Rent</SelectItem>
                  <SelectItem value="194J">194J - Professional</SelectItem>
                  <SelectItem value="194Q">194Q - Purchase</SelectItem>
                  <SelectItem value="N/A">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tds_exemption_applicable">TDS Exemption Applicable</Label>
              <Select value={form.vrf_sections.tds_exemption_applicable} onValueChange={(v) => setVrf("tds_exemption_applicable", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tds_exemption_threshold">TDS Exemption Threshold</Label>
              <Input
                id="tds_exemption_threshold"
                value={form.vrf_sections.tds_exemption_threshold}
                onChange={(e) => setVrf("tds_exemption_threshold", e.target.value)}
                placeholder="e.g. As per applicable Act"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="msme_registered">MSME Registered</Label>
              <Select value={form.vrf_sections.msme_registered} onValueChange={(v) => setVrf("msme_registered", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.vrf_sections.msme_registered === "Yes" && (
              <div className="space-y-1">
                <Label htmlFor="msme_type">MSME Type</Label>
                <Select value={form.vrf_sections.msme_type} onValueChange={(v) => setVrf("msme_type", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Micro">Micro</SelectItem>
                    <SelectItem value="Small">Small</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 3: BILLING / SUPPLY ADDRESS ─────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 3 — Billing / Supply Address
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
              <Label>Phone</Label>
              <Input
                value={form.address_phone}
                onChange={(e) => set("address_phone", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
            <div className="space-y-1">
              <Label>Fax</Label>
              <Input
                value={form.address_fax}
                onChange={(e) => set("address_fax", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 4: HEAD OFFICE / REGISTERED OFFICE ADDRESS ─────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 4 — Head Office / Registered Office Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              id="same_as_billing"
              checked={
                form.vrf_sections.registered_address_line1 === form.address_line1 &&
                form.address_line1 !== ""
              }
              onChange={(e) => {
                if (e.target.checked) {
                  setVrf("registered_address_line1", form.address_line1);
                  setVrf("registered_address_line2", form.address_line2);
                  setVrf("registered_city", form.city);
                  setVrf("registered_state", form.state);
                  setVrf("registered_country", form.country);
                  setVrf("registered_pincode", form.pincode);
                  setVrf("registered_phone", form.address_phone);
                  setVrf("registered_fax", form.address_fax);
                } else {
                  setVrf("registered_address_line1", "");
                  setVrf("registered_address_line2", "");
                  setVrf("registered_city", "");
                  setVrf("registered_state", "");
                  setVrf("registered_country", "India");
                  setVrf("registered_pincode", "");
                  setVrf("registered_phone", "");
                  setVrf("registered_fax", "");
                }
              }}
              className="rounded border-border"
            />
            <Label htmlFor="same_as_billing" className="text-sm font-normal">
              Same as Billing / Supply Address
            </Label>
          </div>

          <div className="space-y-1">
            <Label>Address Line 1</Label>
            <Input
              value={form.vrf_sections.registered_address_line1}
              onChange={(e) => setVrf("registered_address_line1", e.target.value)}
              placeholder="Street / area address"
            />
          </div>
          <div className="space-y-1">
            <Label>Address Line 2</Label>
            <Input
              value={form.vrf_sections.registered_address_line2}
              onChange={(e) => setVrf("registered_address_line2", e.target.value)}
              placeholder="Building / floor / locality"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>City</Label>
              <Input
                value={form.vrf_sections.registered_city}
                onChange={(e) => setVrf("registered_city", e.target.value)}
                placeholder="Mumbai"
              />
            </div>
            <div className="space-y-1">
              <Label>State</Label>
              <Input
                value={form.vrf_sections.registered_state}
                onChange={(e) => setVrf("registered_state", e.target.value)}
                placeholder="Maharashtra"
              />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input
                value={form.vrf_sections.registered_country}
                onChange={(e) => setVrf("registered_country", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Pincode</Label>
              <Input
                value={form.vrf_sections.registered_pincode}
                onChange={(e) => setVrf("registered_pincode", e.target.value)}
                placeholder="400001"
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={form.vrf_sections.registered_phone}
                onChange={(e) => setVrf("registered_phone", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
            <div className="space-y-1">
              <Label>Fax</Label>
              <Input
                value={form.vrf_sections.registered_fax}
                onChange={(e) => setVrf("registered_fax", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 5: CONTACT PERSON DETAILS ───────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 5 — Contact Person Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Contact Person Name *</Label>
              <Input
                value={form.vrf_sections.contact_person_name}
                onChange={(e) => setVrf("contact_person_name", e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1">
              <Label>Designation</Label>
              <Input
                value={form.vrf_sections.contact_person_designation}
                onChange={(e) => setVrf("contact_person_designation", e.target.value)}
                placeholder="e.g. Finance Manager"
              />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.vrf_sections.contact_person_email}
                onChange={(e) => setVrf("contact_person_email", e.target.value)}
                placeholder="contact@company.com"
              />
            </div>
            <div className="space-y-1">
              <Label>Phone (Landline)</Label>
              <Input
                value={form.vrf_sections.contact_person_phone}
                onChange={(e) => setVrf("contact_person_phone", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
            <div className="space-y-1">
              <Label>Mobile</Label>
              <Input
                value={form.vrf_sections.contact_person_mobile}
                onChange={(e) => setVrf("contact_person_mobile", e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-1">
              <Label>Fax</Label>
              <Input
                value={form.vrf_sections.contact_person_fax}
                onChange={(e) => setVrf("contact_person_fax", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 6: BANK / PAYMENT DETAILS ────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 6 — Bank / Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Bank Name *</Label>
            <Input
              value={form.bank_name}
              onChange={(e) => set("bank_name", e.target.value)}
              placeholder="e.g. HDFC Bank"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Account Number *</Label>
              <Input
                value={form.account_number}
                onChange={(e) => set("account_number", e.target.value)}
                placeholder="1234567890"
              />
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
              <Label>Bank Branch Name</Label>
              <Input
                value={form.vrf_sections.bank_branch_name}
                onChange={(e) => setVrf("bank_branch_name", e.target.value)}
                placeholder="Branch name"
              />
            </div>
            <div className="space-y-1">
              <Label>Bank Branch Address</Label>
              <Input
                value={form.vrf_sections.bank_branch_address}
                onChange={(e) => setVrf("bank_branch_address", e.target.value)}
                placeholder="Branch address"
              />
            </div>
            <div className="space-y-1">
              <Label>Account Type</Label>
              <Select value={form.vrf_sections.bank_account_type} onValueChange={(v) => setVrf("bank_account_type", v)}>
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
              <Label>RTGS / NEFT / Fund Transfer Enabled</Label>
              <Select value={form.vrf_sections.rtgs_neft_enabled} onValueChange={(v) => setVrf("rtgs_neft_enabled", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RTGS">RTGS</SelectItem>
                  <SelectItem value="NEFT">NEFT</SelectItem>
                  <SelectItem value="Both">Both RTGS & NEFT</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>MICR Code</Label>
              <Input
                value={form.vrf_sections.micr_code}
                onChange={(e) => setVrf("micr_code", e.target.value)}
                placeholder="400123456"
              />
            </div>
            <div className="space-y-1">
              <Label>Payment Terms</Label>
              <Select value={form.vrf_sections.payment_terms} onValueChange={(v) => setVrf("payment_terms", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Immediate">Immediate</SelectItem>
                  <SelectItem value="15 Days">15 Days</SelectItem>
                  <SelectItem value="30 Days">30 Days</SelectItem>
                  <SelectItem value="45 Days">45 Days</SelectItem>
                  <SelectItem value="60 Days">60 Days</SelectItem>
                  <SelectItem value="90 Days">90 Days</SelectItem>
                  <SelectItem value="As per contract">As per contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Select value={form.vrf_sections.currency} onValueChange={(v) => setVrf("currency", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                  <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Importer / Exporter Code (IEC)</Label>
              <Input
                value={form.vrf_sections.importer_exporter_code}
                onChange={(e) => setVrf("importer_exporter_code", e.target.value)}
                placeholder="AAABB1234C"
              />
            </div>
            <div className="space-y-1">
              <Label>Bank Guarantee Required</Label>
              <Select value={form.vrf_sections.bank_guarantee_required} onValueChange={(v) => setVrf("bank_guarantee_required", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.vrf_sections.bank_guarantee_required === "Yes" && (
              <div className="space-y-1">
                <Label>BG Amount</Label>
                <Input
                  value={form.vrf_sections.bank_guarantee_amount}
                  onChange={(e) => setVrf("bank_guarantee_amount", e.target.value)}
                  placeholder="Amount in INR"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 7: INTERNAL / REQUESTOR DETAILS ──────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 7 — Requestor Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InternalNotice text="These fields are completed by the internal requestor at your organization. They do not need to be filled as part of this submission." />
          <div className="grid grid-cols-2 gap-4">
            <InfoBlock label="Requestor Name" value={form.vrf_sections.requestor_name} />
            <InfoBlock label="Department" value={form.vrf_sections.requestor_department} />
            <InfoBlock label="Email" value={form.vrf_sections.requestor_email} />
            <InfoBlock label="Phone" value={form.vrf_sections.requestor_phone} />
            <InfoBlock label="Date" value={form.vrf_sections.requestor_date} />
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 8: COMPANY / PURCHASING / SAP DETAILS ────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 8 — Company / Purchasing / SAP Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InternalNotice text="SAP and company codes are assigned by the finance team after review. These fields are informational only." />
          <div className="grid grid-cols-2 gap-4">
            <InfoBlock label="SAP Vendor Code" value={form.vrf_sections.sap_vendor_code} />
            <InfoBlock label="Company Code" value={form.vrf_sections.company_code} />
            <InfoBlock label="Purchase Group" value={form.vrf_sections.purchase_group} />
            <InfoBlock label="Purchasing Organization" value={form.vrf_sections.purchasing_org} />
            <InfoBlock label="Purchase Make" value={form.vrf_sections.purchase_make} />
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 9: APPROVER BLOCK ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 9 — Approver Block
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InternalNotice text="Approver details are completed by the internal team during the approval process." />
          <div className="grid grid-cols-2 gap-4">
            <InfoBlock label="Approver Name" value={form.vrf_sections.approver_name} />
            <InfoBlock label="Designation" value={form.vrf_sections.approver_designation} />
            <InfoBlock label="Department" value={form.vrf_sections.approver_department} />
            <InfoBlock label="Email" value={form.vrf_sections.approver_email} />
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 10: DECLARATION ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 10 — Declaration
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Authorized Signatory Name *</Label>
              <Input
                value={form.vrf_sections.authorized_signatory_name}
                onChange={(e) => setVrf("authorized_signatory_name", e.target.value)}
                placeholder="Full name of signatory"
              />
            </div>
            <div className="space-y-1">
              <Label>Designation *</Label>
              <Input
                value={form.vrf_sections.authorized_signatory_designation}
                onChange={(e) => setVrf("authorized_signatory_designation", e.target.value)}
                placeholder="e.g. Managing Director"
              />
            </div>
            <div className="space-y-1">
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.vrf_sections.authorized_signatory_date}
                onChange={(e) => setVrf("authorized_signatory_date", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Place *</Label>
              <Input
                value={form.vrf_sections.place}
                onChange={(e) => setVrf("place", e.target.value)}
                placeholder="e.g. Mumbai"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="declaration_confirmed"
              checked={declarationConfirmed}
              onChange={(e) => setDeclarationConfirmed(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="declaration_confirmed" className="text-sm font-normal">
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
          disabled={isPending || !declarationConfirmed}
          className="flex-1"
        >
          {isPending ? (
            <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Submitting...</>
          ) : (
            doFinalize ? (
              <><Send className="mr-1.5 h-4 w-4" /> Finalize & Submit</>
            ) : (
              <><Send className="mr-1.5 h-4 w-4" /> Submit & Finalize</>
            )
          )}
        </Button>
      </div>
      {!declarationConfirmed && (
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
  "GST Certificate",
  "PAN Card",
  "Bank Letter / MICR",
  "MSME Certificate",
  "Address Proof",
  "Import/Export Code",
  "TDS Certificate",
  "Cancelled Cheque",
  "Contract / Agreement",
  "Other",
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
                    <SelectItem key={t} value={t}>{t}</SelectItem>
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
            disabled={!file || !title.trim() || isAdding}
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
              onSubmit={(payload) => {
                setSubmitError(null);
                submitManualMutation.mutate(payload, {
                  onSuccess: () => {
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
