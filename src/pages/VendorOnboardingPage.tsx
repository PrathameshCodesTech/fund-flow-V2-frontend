/**
 * VendorOnboardingPage — public token-based vendor onboarding.
 *
 * Route: /vendor/onboarding/:token
 *
 * Staged flow (3 stages):
 *   1. Vendor Details   (manual form OR workbook upload + extracted review)
 *   2. Attachments      (supporting documents)
 *   3. Review & Finalize (summary + declaration + submit)
 *
 * Manual path:  choose_method → manual_details → attachments → finalize_review → submitted
 * Upload path:  choose_method → upload_template → review_details → attachments → finalize_review → submitted
 *
 * On re-entry (existing draft):
 *   - excel draft  → resume at review_details
 *   - manual draft → resume at manual_details
 *   - no draft     → choose_method
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
  removePublicAttachment,
  finalizeInvitation,
} from "@/lib/api/v2vendor";
import type {
  VendorInvitation,
  VendorOnboardingSubmission,
  VendorAttachment,
  ContactPerson,
} from "@/lib/types/v2vendor";
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
  X,
  ArrowLeft,
  RefreshCw,
  Upload,
  FileText,
  Send,
  Download,
  Trash2,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function generalApiError(err: unknown): string | null {
  if (err instanceof ApiError) {
    return err.errors["detail"]?.[0] ?? err.message ?? null;
  }
  if (err instanceof Error) return err.message;
  return null;
}

// ── Form state interfaces ─────────────────────────────────────────────────────

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
  // Section 1: Vendor Information
  title: string;
  vendor_name: string;
  vendor_type: string;
  gst_registration: "registered" | "unregistered" | "";
  gstin: string;
  // Section 2: Supplying / Billing Address
  address_line1: string;
  address_line2: string;
  address_line3: string;
  city: string;
  pincode: string;
  state: string;
  country: string;
  phone: string;
  fax: string;
  email: string;
  region: string;
  head_office_no: string;
  // Section 3: Tax Registration Nos (moved up)
  tax_registration_details: TaxRegistrationBlock;
  pan: string;
  // Section 4: Head Office Address
  head_office_address: HeadOfficeAddressBlock;
  // Section 5: Contact Persons
  contact_persons: [ContactPersonEntry, ContactPersonEntry];
  // Section 6: Payment Details
  preferred_payment_mode: string;
  // Section 7: Bank Details
  bank_name: string;
  bank_address: string;
  bank_branch_address_line1: string;
  bank_branch_address_line2: string;
  bank_branch_city: string;
  bank_branch_pincode: string;
  bank_branch_state: string;
  bank_branch_country: string;
  bank_phone: string;
  bank_fax: string;
  beneficiary_name: string;
  beneficiary_account_number: string;
  bank_account_number: string;
  account_number: string;
  bank_account_type: string;
  micr_code: string;
  neft_code: string;
  ifsc: string;
  bank_email: string;
  // Section 8: MSME Declaration
  msme_registered: boolean;
  msme_registration_number: string;
  msme_enterprise_type: "" | "micro" | "small" | "medium";
  authorized_signatory_name: string;
  // Legacy compat
  gst_registered: boolean;
}

type SectionKey = keyof ManualFormState;

const EDITABLE_SUBMISSION_STATUSES = new Set([
  "draft",
  "reopened",
  "finance_rejected",
]);

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
  // Section 1: Vendor Information
  title: "",
  vendor_name: "",
  vendor_type: "",
  gst_registration: "",
  gstin: "",
  // Section 2: Supplying / Billing Address
  address_line1: "",
  address_line2: "",
  address_line3: "",
  city: "",
  pincode: "",
  state: "",
  country: "India",
  phone: "",
  fax: "",
  email: "",
  region: "",
  head_office_no: "",
  // Section 3: Tax Registration Nos
  tax_registration_details: emptyTaxRegistration(),
  pan: "",
  // Section 4: Head Office Address
  head_office_address: emptyHeadOfficeAddress(),
  // Section 5: Contact Persons
  contact_persons: [emptyContactPerson(), emptyContactPerson()],
  // Section 6: Payment Details
  preferred_payment_mode: "",
  // Section 7: Bank Details
  bank_name: "",
  bank_address: "",
  bank_branch_address_line1: "",
  bank_branch_address_line2: "",
  bank_branch_city: "",
  bank_branch_pincode: "",
  bank_branch_state: "",
  bank_branch_country: "India",
  bank_phone: "",
  bank_fax: "",
  beneficiary_name: "",
  beneficiary_account_number: "",
  bank_account_number: "",
  account_number: "",
  bank_account_type: "",
  micr_code: "",
  neft_code: "",
  ifsc: "",
  bank_email: "",
  // Section 8: MSME Declaration
  msme_registered: false,
  msme_registration_number: "",
  msme_enterprise_type: "",
  authorized_signatory_name: "",
  // Legacy compat
  gst_registered: false,
});

function buildPayload(form: ManualFormState): Record<string, unknown> {
  // Derive gst_registered from gst_registration dropdown
  const gstRegistered = form.gst_registration === "registered";

  return {
    // Section 1: Vendor Information
    title: form.title,
    vendor_name: form.vendor_name,
    vendor_type: form.vendor_type,
    gst_registered: gstRegistered,
    gstin: form.gstin,
    // Section 2: Supplying / Billing Address
    address_line1: form.address_line1,
    address_line2: form.address_line2,
    address_line3: form.address_line3,
    city: form.city,
    pincode: form.pincode,
    state: form.state,
    country: form.country,
    phone: form.phone,
    fax: form.fax,
    email: form.email,
    region: form.region,
    head_office_no: form.head_office_no,
    // Section 3: Tax Registration Nos
    pan: form.pan,
    tax_registration_details: form.tax_registration_details,
    // Section 4: Head Office Address
    head_office_address: form.head_office_address,
    // Section 5: Contact Persons
    contact_persons: form.contact_persons.filter(
      (cp) => cp.name.trim() || cp.email.trim()
    ),
    // Section 6: Payment Details
    preferred_payment_mode: form.preferred_payment_mode,
    // Section 7: Bank Details - mapped to backend normalized fields
    bank_name: form.bank_name,
    bank_address: form.bank_address,
    beneficiary_name: form.beneficiary_name,
    beneficiary_account_number: form.beneficiary_account_number,
    bank_account_number: form.bank_account_number,
    account_number: form.account_number || form.bank_account_number, // backward compat
    bank_account_type: form.bank_account_type,
    micr_code: form.micr_code,
    neft_code: form.neft_code,
    ifsc: form.ifsc,
    bank_email: form.bank_email,
    bank_branch_address_line1: form.bank_branch_address_line1,
    bank_branch_address_line2: form.bank_branch_address_line2,
    bank_branch_city: form.bank_branch_city,
    bank_branch_state: form.bank_branch_state,
    bank_branch_country: form.bank_branch_country,
    bank_branch_pincode: form.bank_branch_pincode,
    bank_phone: form.bank_phone,
    bank_fax: form.bank_fax,
    // Section 8: MSME Declaration
    msme_registered: form.msme_registered,
    msme_registration_number: form.msme_registration_number,
    msme_enterprise_type: form.msme_enterprise_type,
    authorized_signatory_name: form.authorized_signatory_name,
  };
}

// ── Stage indicator ───────────────────────────────────────────────────────────

type Mode =
  | "loading"
  | "choose_method"
  | "manual_details"
  | "upload_template"
  | "review_details"
  | "attachments"
  | "finalize_review"
  | "submitted";

function StageIndicator({ mode }: { mode: Mode }) {
  const stage =
    ["manual_details", "upload_template", "review_details"].includes(mode)
      ? 1
      : mode === "attachments"
      ? 2
      : mode === "finalize_review"
      ? 3
      : 0;

  const steps = [
    { n: 1, label: "Vendor Details" },
    { n: 2, label: "Attachments" },
    { n: 3, label: "Review & Finalize" },
  ];

  return (
    <div className="flex items-center">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-1.5 shrink-0">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                stage > s.n
                  ? "bg-primary text-primary-foreground"
                  : stage === s.n
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {stage > s.n ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
            </div>
            <span
              className={`text-xs font-medium hidden sm:block ${
                stage >= s.n ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-px mx-2 ${
                stage > s.n ? "bg-primary" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Invalid token screen ───────────────────────────────────────────────────────

function InvalidTokenScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-sm w-full text-center">
        <CardContent className="pt-6">
          <XCircle className="w-14 h-14 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">
            Invalid Invitation
          </h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Manual details step ───────────────────────────────────────────────────────
// Used for both: manual path (with Save Draft) and review_details (upload path, no Save Draft).

function ManualStep({
  invitation,
  initialSubmission,
  onSaveDraft,
  onContinue,
  isPending,
  error,
  showSaveDraft = true,
  continueLabel = "Continue to Attachments",
  lastSaved,
  topBanner,
}: {
  invitation: VendorInvitation;
  initialSubmission?: VendorOnboardingSubmission | null;
  onSaveDraft: (data: Record<string, unknown>) => void;
  onContinue: (data: Record<string, unknown>) => void;
  isPending: boolean;
  error: string | null;
  showSaveDraft?: boolean;
  continueLabel?: string;
  lastSaved?: string | null;
  topBanner?: React.ReactNode;
}) {
  const [form, setForm] = useState<ManualFormState>(emptyForm());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || !initialSubmission) return;
    const s = initialSubmission;
    // Derive gst_registration from boolean
    const gstReg: ManualFormState["gst_registration"] =
      s.normalized_gst_registered === true ? "registered" :
      s.normalized_gst_registered === false ? "unregistered" : "";

    setForm({
      // Section 1: Vendor Information
      title: s.normalized_title ?? "",
      vendor_name: s.normalized_vendor_name ?? "",
      vendor_type: s.normalized_vendor_type ?? "",
      gst_registration: gstReg,
      gstin: s.normalized_gstin ?? "",
      // Section 2: Supplying / Billing Address
      address_line1: s.normalized_address_line1 ?? "",
      address_line2: s.normalized_address_line2 ?? "",
      address_line3: s.normalized_address_line3 ?? "",
      city: s.normalized_city ?? "",
      pincode: s.normalized_pincode ?? "",
      state: s.normalized_state ?? "",
      country: s.normalized_country ?? "India",
      phone: s.normalized_phone ?? "",
      fax: s.normalized_fax ?? "",
      email: s.normalized_email ?? "",
      region: s.normalized_region ?? "",
      head_office_no: s.normalized_head_office_no ?? "",
      // Section 3: Tax Registration Nos
      pan: s.normalized_pan ?? "",
      tax_registration_details: {
        tax_registration_nos: s.tax_registration_details_json?.tax_registration_nos ?? "",
        tin_no: s.tax_registration_details_json?.tin_no ?? "",
        cst_no: s.tax_registration_details_json?.cst_no ?? "",
        lst_no: s.tax_registration_details_json?.lst_no ?? "",
        esic_reg_no: s.tax_registration_details_json?.esic_reg_no ?? "",
        pan_ref_no: s.tax_registration_details_json?.pan_ref_no ?? "",
        ppf_no: s.tax_registration_details_json?.ppf_no ?? "",
      },
      // Section 4: Head Office Address
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
      // Section 5: Contact Persons
      contact_persons: hydrateContactPersons(s.contact_persons_json),
      // Section 6: Payment Details
      preferred_payment_mode: s.normalized_preferred_payment_mode ?? "",
      // Section 7: Bank Details
      bank_name: s.normalized_bank_name ?? "",
      bank_address: s.normalized_bank_address ?? "",
      bank_branch_address_line1: s.normalized_bank_branch_address_line1 ?? "",
      bank_branch_address_line2: s.normalized_bank_branch_address_line2 ?? "",
      bank_branch_city: s.normalized_bank_branch_city ?? "",
      bank_branch_pincode: s.normalized_bank_branch_pincode ?? "",
      bank_branch_state: s.normalized_bank_branch_state ?? "",
      bank_branch_country: s.normalized_bank_branch_country ?? "India",
      bank_phone: s.normalized_bank_phone ?? "",
      bank_fax: s.normalized_bank_fax ?? "",
      beneficiary_name: s.normalized_beneficiary_name ?? "",
      beneficiary_account_number: s.normalized_beneficiary_account_number ?? "",
      bank_account_number: s.normalized_bank_account_number ?? "",
      account_number: s.normalized_account_number ?? "",
      bank_account_type: s.normalized_bank_account_type ?? "",
      micr_code: s.normalized_micr_code ?? "",
      neft_code: s.normalized_neft_code ?? "",
      ifsc: s.normalized_ifsc ?? "",
      bank_email: s.normalized_bank_email ?? "",
      // Section 8: MSME Declaration
      msme_registered: s.normalized_msme_registered ?? false,
      msme_registration_number: s.normalized_msme_registration_number ?? "",
      msme_enterprise_type:
        (s.normalized_msme_enterprise_type as ManualFormState["msme_enterprise_type"]) ?? "",
      authorized_signatory_name: s.normalized_authorized_signatory_name ?? "",
      // Legacy compat
      gst_registered: s.normalized_gst_registered ?? false,
    });
    setHydrated(true);
  }, [initialSubmission, hydrated]);

  function hydrateContactPersons(
    cps: ContactPerson[] | null
  ): [ContactPersonEntry, ContactPersonEntry] {
    const rows = (cps ?? [])
      .filter((cp) => cp.name?.trim() || cp.email?.trim())
      .slice(0, 2);
    while (rows.length < 2) rows.push(emptyContactPerson());
    return rows as [ContactPersonEntry, ContactPersonEntry];
  }

  const set = <K extends SectionKey>(key: K, value: ManualFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setContactPerson = (
    idx: number,
    field: keyof ContactPersonEntry,
    value: string
  ) =>
    setForm((f) => {
      const updated = [...f.contact_persons] as [
        ContactPersonEntry,
        ContactPersonEntry,
      ];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...f, contact_persons: updated };
    });

  const setHeadOffice = <K extends keyof HeadOfficeAddressBlock>(
    key: K,
    value: string
  ) =>
    setForm((f) => ({
      ...f,
      head_office_address: { ...f.head_office_address, [key]: value },
    }));

  const setTaxReg = <K extends keyof TaxRegistrationBlock>(
    key: K,
    value: string
  ) =>
    setForm((f) => ({
      ...f,
      tax_registration_details: { ...f.tax_registration_details, [key]: value },
    }));

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
      </div>

      {/* Optional top banner (e.g. workbook info for review_details) */}
      {topBanner}

      {/* ── SECTION 1: VENDOR INFORMATION ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 1 — Vendor Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="title">Title *</Label>
              <Select value={form.title} onValueChange={(v) => set("title", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Company">Company</SelectItem>
                  <SelectItem value="Mr.">Mr.</SelectItem>
                  <SelectItem value="Mrs.">Mrs.</SelectItem>
                  <SelectItem value="M/s">M/s</SelectItem>
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
              <Label htmlFor="vendor_type">Type of Vendor *</Label>
              <Select
                value={form.vendor_type}
                onValueChange={(v) => set("vendor_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Person">Person</SelectItem>
                  <SelectItem value="Organisation">Organisation</SelectItem>
                  <SelectItem value="Group">Group</SelectItem>
                  <SelectItem value="MSME">MSME</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="gst_registration">GST Registration *</Label>
              <Select
                value={form.gst_registration}
                onValueChange={(v) => set("gst_registration", v as ManualFormState["gst_registration"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="unregistered">Un-Registered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.gst_registration === "registered" && (
              <div className="space-y-1">
                <Label htmlFor="gstin">GSTIN Number *</Label>
                <Input
                  id="gstin"
                  value={form.gstin}
                  onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                  placeholder="27AAACZ1234F1Z5"
                  maxLength={15}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: SUPPLYING / BILLING ADDRESS ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 2 — Supplying / Billing Address
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>City *</Label>
              <Input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Mumbai"
              />
            </div>
            <div className="space-y-1">
              <Label>Pin Code *</Label>
              <Input
                value={form.pincode}
                onChange={(e) => set("pincode", e.target.value)}
                placeholder="400001"
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
              <Label>Country *</Label>
              <Input
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone no</Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-1">
              <Label>Fax no</Label>
              <Input
                value={form.fax}
                onChange={(e) => set("fax", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
            <div className="space-y-1">
              <Label>Email Id *</Label>
              <Input
                value={form.email || invitation.vendor_email}
                readOnly
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Prefilled from invitation (read-only)</p>
            </div>
            <div className="space-y-1">
              <Label>Region</Label>
              <Input
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                placeholder="e.g. West, East, North, South"
              />
            </div>
            <div className="space-y-1">
              <Label>Head Office no</Label>
              <Input
                value={form.head_office_no}
                onChange={(e) => set("head_office_no", e.target.value)}
                placeholder="e.g. HO-001"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 3: TAX REGISTRATION NOS ─────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 3 — Tax Registration Nos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>TIN NO</Label>
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
              <Label>PAN No. *</Label>
              <Input
                value={form.pan}
                onChange={(e) => set("pan", e.target.value.toUpperCase())}
                placeholder="AAAPL1234C"
                maxLength={10}
              />
            </div>
            <div className="space-y-1">
              <Label>ESIC Reg NO</Label>
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

      {/* ── SECTION 4: HEAD OFFICE ADDRESS ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 4 — Head Office Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Address line 1</Label>
            <Input
              value={form.head_office_address.address_line1}
              onChange={(e) => setHeadOffice("address_line1", e.target.value)}
              placeholder="Street / area address"
            />
          </div>
          <div className="space-y-1">
            <Label>Address line 2</Label>
            <Input
              value={form.head_office_address.address_line2}
              onChange={(e) => setHeadOffice("address_line2", e.target.value)}
              placeholder="Building / floor / locality"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>City</Label>
              <Input
                value={form.head_office_address.city}
                onChange={(e) => setHeadOffice("city", e.target.value)}
                placeholder="City"
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
              <Label>Phone no</Label>
              <Input
                value={form.head_office_address.phone}
                onChange={(e) => setHeadOffice("phone", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
            <div className="space-y-1">
              <Label>Fax no</Label>
              <Input
                value={form.head_office_address.fax}
                onChange={(e) => setHeadOffice("fax", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 5: CONTACT PERSONS ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 5 — Contact Persons
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            General Queries
          </p>
          {form.contact_persons.map((cp, idx) => (
            <div key={idx} className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                Contact {idx + 1}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Name {idx === 0 ? "*" : ""}</Label>
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
                  <Label>Email Address</Label>
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

      {/* ── SECTION 6: PAYMENT DETAILS ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 6 — Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Preffered Payment Mode *</Label>
            <Select
              value={form.preferred_payment_mode}
              onValueChange={(v) => set("preferred_payment_mode", v)}
            >
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
        </CardContent>
      </Card>

      {/* ── SECTION 7: BANK DETAILS ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 7 — Bank Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Bank Name</Label>
              <Input
                value={form.bank_name}
                onChange={(e) => set("bank_name", e.target.value)}
                placeholder="e.g. HDFC Bank"
              />
            </div>
            <div className="space-y-1">
              <Label>Bank Address</Label>
              <Input
                value={form.bank_address}
                onChange={(e) => set("bank_address", e.target.value)}
                placeholder="Bank address"
              />
            </div>
          </div>

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 pb-1">
            Bank Branch Address
          </p>
          <div className="space-y-1">
            <Label>Address line</Label>
            <Input
              value={form.bank_branch_address_line1}
              onChange={(e) => set("bank_branch_address_line1", e.target.value)}
              placeholder="Street / area"
            />
          </div>
          <div className="space-y-1">
            <Label>Address line2</Label>
            <Input
              value={form.bank_branch_address_line2}
              onChange={(e) => set("bank_branch_address_line2", e.target.value)}
              placeholder="Building / floor"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>City</Label>
              <Input
                value={form.bank_branch_city}
                onChange={(e) => set("bank_branch_city", e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-1">
              <Label>Pin code</Label>
              <Input
                value={form.bank_branch_pincode}
                onChange={(e) => set("bank_branch_pincode", e.target.value)}
                placeholder="400001"
              />
            </div>
            <div className="space-y-1">
              <Label>State</Label>
              <Input
                value={form.bank_branch_state}
                onChange={(e) => set("bank_branch_state", e.target.value)}
                placeholder="State"
              />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input
                value={form.bank_branch_country}
                onChange={(e) => set("bank_branch_country", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone No</Label>
              <Input
                value={form.bank_phone}
                onChange={(e) => set("bank_phone", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
            <div className="space-y-1">
              <Label>Fax No</Label>
              <Input
                value={form.bank_fax}
                onChange={(e) => set("bank_fax", e.target.value)}
                placeholder="+91 ..."
              />
            </div>
          </div>

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 pb-1">
            Account Details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Beneficiary Name</Label>
              <Input
                value={form.beneficiary_name}
                onChange={(e) => set("beneficiary_name", e.target.value)}
                placeholder="Name as per bank records"
              />
            </div>
            <div className="space-y-1">
              <Label>Beneficiary Account No</Label>
              <Input
                value={form.beneficiary_account_number}
                onChange={(e) => set("beneficiary_account_number", e.target.value)}
                placeholder="Account number"
              />
            </div>
            <div className="space-y-1">
              <Label>Bank Account No</Label>
              <Input
                value={form.bank_account_number}
                onChange={(e) => set("bank_account_number", e.target.value)}
                placeholder="1234567890"
              />
            </div>
            <div className="space-y-1">
              <Label>Bank account type</Label>
              <Select
                value={form.bank_account_type}
                onValueChange={(v) => set("bank_account_type", v)}
              >
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
              <Label>Bank MICR code</Label>
              <Input
                value={form.micr_code}
                onChange={(e) => set("micr_code", e.target.value)}
                placeholder="400123456"
              />
            </div>
            <div className="space-y-1">
              <Label>NEFT code</Label>
              <Input
                value={form.neft_code}
                onChange={(e) => set("neft_code", e.target.value)}
                placeholder="NEFT code"
              />
            </div>
            <div className="space-y-1">
              <Label>IFSC code</Label>
              <Input
                value={form.ifsc}
                onChange={(e) => set("ifsc", e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
              />
            </div>
            <div className="space-y-1">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={form.bank_email}
                onChange={(e) => set("bank_email", e.target.value)}
                placeholder="bank@email.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 8: MSME DECLARATION ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Section 8 — MSME Declaration
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  onValueChange={(v) =>
                    set("msme_enterprise_type", v as "micro" | "small" | "medium" | "")
                  }
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

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className={`flex gap-3 ${!showSaveDraft ? "" : ""}`}>
        {showSaveDraft && (
          <Button
            variant="outline"
            onClick={() => onSaveDraft(buildPayload(form))}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save Draft"
            )}
          </Button>
        )}
        <Button
          onClick={() => onContinue(buildPayload(form))}
          disabled={isPending}
          className={showSaveDraft ? "flex-1" : "w-full"}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            continueLabel
          )}
        </Button>
      </div>
      {lastSaved && (
        <p className="text-xs text-center text-muted-foreground">
          Draft saved at {lastSaved}
        </p>
      )}
    </div>
  );
}

// ── Upload template step ──────────────────────────────────────────────────────

function UploadTemplateStep({
  invitation,
  onUpload,
  isPending,
  error,
}: {
  invitation: VendorInvitation;
  onUpload: (file: File) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm">
          Invitation for <strong>{invitation.vendor_email}</strong>
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base">Upload VRF Workbook</CardTitle>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a
                href="/templates/vendor-vrf-upload-template.xlsx"
                download="vendor-vrf-upload-template.xlsx"
              >
                <Download className="h-4 w-4" />
                Download Template
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload the completed official Vendor Registration Form (VRF)
            workbook in .xlsx format. The template includes all onboarding
            fields and will be parsed automatically for your review.
          </p>

          <div className="rounded-lg border border-border bg-secondary/20 p-4">
            <p className="text-sm font-medium text-foreground">
              Use the official template for best extraction.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>• Keep the labels unchanged.</li>
              <li>• Enter your values in column B only.</li>
              <li>• Do not delete rows or rename headings.</li>
              <li>• Any missing values can still be corrected in the review step after parsing.</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Template coverage includes business details, billing address,
              payment and branch contact details, contact persons, head office
              address, tax registration details, and MSME declaration fields.
            </p>
          </div>

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

      <Button
        onClick={() => file && onUpload(file)}
        disabled={!file || isPending}
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Parsing
            workbook…
          </>
        ) : (
          <>
            <Upload className="mr-1.5 h-4 w-4" /> Parse & Review Vendor Details
          </>
        )}
      </Button>
    </div>
  );
}

// ── Attachments step ──────────────────────────────────────────────────────────

const BASE_ATTACHMENT_REQUIREMENTS = [
  { value: "gst_certificate", label: "GST Certificate", description: "Upload the GST registration certificate." },
  { value: "pan_copy", label: "PAN Copy", description: "Upload the vendor PAN card or PAN allotment document." },
  { value: "cancelled_cheque", label: "Cancelled Cheque", description: "Upload a cancelled cheque for bank verification." },
] as const;

const MSME_ATTACHMENT_REQUIREMENTS = [
  { value: "msme_declaration_form", label: "MSME Declaration Form", description: "Required only when MSME Registered is Yes." },
  { value: "msme_registration_certificate", label: "MSME Registration Certificate (UDYAM)", description: "Required only when MSME Registered is Yes." },
] as const;

type AttachmentRequirement =
  | (typeof BASE_ATTACHMENT_REQUIREMENTS)[number]
  | (typeof MSME_ATTACHMENT_REQUIREMENTS)[number];

// Helper to map raw document_type to friendly label
const DOC_TYPE_LABELS: Record<string, string> = {
  gst_certificate: "GST Certificate",
  pan_copy: "PAN Copy",
  cancelled_cheque: "Cancelled Cheque",
  msme_declaration_form: "MSME Declaration Form",
  msme_registration_certificate: "MSME Registration Certificate (UDYAM)",
};

function getDocTypeLabel(docType: string): string {
  return DOC_TYPE_LABELS[docType] ?? docType;
}

type OnboardingAttachment = Pick<
  VendorAttachment,
  "id" | "title" | "file_name" | "document_type"
>;

function normalizeOnboardingAttachments(
  attachments: OnboardingAttachment[],
): OnboardingAttachment[] {
  const seenDocumentTypes = new Set<string>();
  const normalized: OnboardingAttachment[] = [];

  for (const attachment of attachments) {
    if (!attachment.document_type) {
      normalized.push(attachment);
      continue;
    }
    if (seenDocumentTypes.has(attachment.document_type)) continue;
    seenDocumentTypes.add(attachment.document_type);
    normalized.push(attachment);
  }

  return normalized;
}

function AttachmentsStep({
  attachments,
  onAdd,
  onRemove,
  onBack,
  onContinue,
  isAdding,
  isRemoving,
  error,
  msmeRegistered,
}: {
  attachments: OnboardingAttachment[];
  onAdd: (file: File, title: string, documentType: string) => void;
  onRemove: (attachment: OnboardingAttachment) => void;
  onBack: () => void;
  onContinue: () => void;
  isAdding: boolean;
  isRemoving: boolean;
  error: string | null;
  msmeRegistered: boolean;
}) {
  const [filesByType, setFilesByType] = useState<Record<string, File | null>>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const requirements: AttachmentRequirement[] = [
    ...BASE_ATTACHMENT_REQUIREMENTS,
    ...(msmeRegistered ? MSME_ATTACHMENT_REQUIREMENTS : []),
  ];
  const uploadedByType = new Map<string, OnboardingAttachment>();
  for (const attachment of attachments) {
    if (attachment.document_type && !uploadedByType.has(attachment.document_type)) {
      uploadedByType.set(attachment.document_type, attachment);
    }
  }
  const missingRequirements = requirements.filter(
    (requirement) => !uploadedByType.has(requirement.value)
  );

  const handleAdd = (requirement: AttachmentRequirement) => {
    const file = filesByType[requirement.value];
    if (!file) {
      setLocalError(`Please attach ${requirement.label}.`);
      return;
    }
    setLocalError(null);
    onAdd(file, requirement.label, requirement.value);
    setFilesByType((prev) => ({ ...prev, [requirement.value]: null }));
  };

  const handleContinue = () => {
    if (missingRequirements.length > 0) {
      setLocalError(
        `Please upload required documents: ${missingRequirements
          .map((requirement) => requirement.label)
          .join(", ")}.`
      );
      return;
    }
    setLocalError(null);
    onContinue();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Supporting Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload each required document below. Attachments are saved to this
            draft as soon as you upload them. Accepted: PDF, JPG, PNG, Excel,
            Word, text, or CSV (max 10 MB each).
          </p>
          <div className="space-y-3">
            {requirements.map((requirement) => {
              const uploaded = uploadedByType.get(requirement.value);
              const selectedFile = filesByType[requirement.value];
              return (
                <div key={requirement.value} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {uploaded ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{requirement.label} *</p>
                      <p className="text-xs text-muted-foreground">{requirement.description}</p>
                      {uploaded && (
                        <p className="mt-1 text-xs text-muted-foreground truncate">
                          Uploaded: {uploaded.file_name}
                        </p>
                      )}
                      {requirement.value === "msme_declaration_form" && (
                        <a
                          href="/templates/msme-declaration-form.docx"
                          download="msme-declaration-form.docx"
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download MSME Word format
                        </a>
                      )}
                    </div>
                  </div>
                  {selectedFile && (
                    <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/30 p-2.5">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFilesByType((prev) => ({ ...prev, [requirement.value]: null }))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button asChild variant="outline" size="sm" className="gap-1.5">
                      <label>
                        <Upload className="h-3.5 w-3.5" />
                        Choose File
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx,.txt,.csv"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setFilesByType((prev) => ({ ...prev, [requirement.value]: file }));
                          }}
                        />
                      </label>
                    </Button>
                    <Button
                      variant={uploaded ? "secondary" : "default"}
                      size="sm"
                      onClick={() => handleAdd(requirement)}
                      disabled={!selectedFile || isAdding || isRemoving}
                      className="gap-1.5"
                    >
                      {isAdding ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Uploading
                        </>
                      ) : uploaded ? (
                        "Replace Uploaded File"
                      ) : (
                        "Upload & Save Draft"
                      )}
                    </Button>
                    {uploaded && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(uploaded)}
                        disabled={isAdding || isRemoving}
                        className="gap-1.5 text-destructive hover:text-destructive"
                      >
                        {isRemoving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {localError && <p className="text-sm text-destructive">{localError}</p>}
        </CardContent>
      </Card>
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleContinue} className="w-full sm:flex-1">
          Continue to Review &amp; Finalize
        </Button>
      </div>
    </div>
  );
}

function ReviewField({
  label,
  value,
}: {
  label: string;
  value?: string | boolean | null;
}) {
  if (value === null || value === undefined || value === "") return null;
  const text =
    typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <div className="space-y-0.5 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm break-words">{text}</p>
    </div>
  );
}

function FinalizeReviewStep({
  submission,
  attachments,
  onFinalize,
  onBack,
  isPending,
  error,
}: {
  submission: VendorOnboardingSubmission;
  attachments: OnboardingAttachment[];
  onFinalize: () => void;
  onBack: () => void;
  isPending: boolean;
  error: string | null;
}) {
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const contacts = submission.contact_persons_json ?? [];
  const headOffice = submission.head_office_address_json;
  const taxReg = submission.tax_registration_details_json;

  return (
    <div className="space-y-5">
      {/* Business Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Business Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <ReviewField label="Title" value={submission.normalized_title} />
            <ReviewField label="Vendor Name" value={submission.normalized_vendor_name} />
            <ReviewField label="Vendor Type" value={submission.normalized_vendor_type} />
            <ReviewField label="Email" value={submission.normalized_email} />
            <ReviewField label="Phone" value={submission.normalized_phone} />
            <ReviewField label="Fax" value={submission.normalized_fax} />
            <ReviewField label="GST Registered" value={submission.normalized_gst_registered} />
            <ReviewField label="GSTIN" value={submission.normalized_gstin} />
            <ReviewField label="PAN" value={submission.normalized_pan} />
            <ReviewField label="Region" value={submission.normalized_region} />
            <ReviewField label="Head Office No." value={submission.normalized_head_office_no} />
          </div>
        </CardContent>
      </Card>

      {/* Billing Address */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Billing Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <ReviewField label="Address Line 1" value={submission.normalized_address_line1} />
            <ReviewField label="Address Line 2" value={submission.normalized_address_line2} />
            <ReviewField label="Address Line 3" value={submission.normalized_address_line3} />
            <ReviewField label="City" value={submission.normalized_city} />
            <ReviewField label="State" value={submission.normalized_state} />
            <ReviewField label="Country" value={submission.normalized_country} />
            <ReviewField label="Pincode" value={submission.normalized_pincode} />
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <ReviewField label="Payment Mode" value={submission.normalized_preferred_payment_mode} />
            <ReviewField label="Beneficiary Name" value={submission.normalized_beneficiary_name} />
            <ReviewField label="Bank Name" value={submission.normalized_bank_name} />
            <ReviewField label="Account Number" value={submission.normalized_account_number} />
            <ReviewField label="Account Type" value={submission.normalized_bank_account_type} />
            <ReviewField label="IFSC Code" value={submission.normalized_ifsc} />
            <ReviewField label="MICR Code" value={submission.normalized_micr_code} />
            <ReviewField label="NEFT Code" value={submission.normalized_neft_code} />
          </div>
          {(submission.normalized_bank_branch_city || submission.normalized_bank_branch_address_line1) && (
            <>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">
                Bank Branch
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <ReviewField label="Branch Address 1" value={submission.normalized_bank_branch_address_line1} />
                <ReviewField label="Branch Address 2" value={submission.normalized_bank_branch_address_line2} />
                <ReviewField label="Branch City" value={submission.normalized_bank_branch_city} />
                <ReviewField label="Branch State" value={submission.normalized_bank_branch_state} />
                <ReviewField label="Branch Country" value={submission.normalized_bank_branch_country} />
                <ReviewField label="Branch Pincode" value={submission.normalized_bank_branch_pincode} />
                <ReviewField label="Branch Phone" value={submission.normalized_bank_phone} />
                <ReviewField label="Branch Fax" value={submission.normalized_bank_fax} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Contact Persons */}
      {contacts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Contact Persons
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contacts.map((cp, i) => (
              <div
                key={i}
                className="rounded-lg border border-border p-3"
              >
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Contact {i + 1}{cp.type ? ` — ${cp.type === "general_queries" ? "General Queries" : "Secondary"}` : ""}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <ReviewField label="Name" value={cp.name} />
                  <ReviewField label="Designation" value={cp.designation} />
                  <ReviewField label="Email" value={cp.email} />
                  <ReviewField label="Telephone" value={cp.telephone} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Head Office Address */}
      {headOffice &&
        (headOffice.address_line1 || headOffice.city || headOffice.phone) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                Head Office Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <ReviewField label="Address Line 1" value={headOffice.address_line1} />
                <ReviewField label="Address Line 2" value={headOffice.address_line2} />
                <ReviewField label="City" value={headOffice.city} />
                <ReviewField label="State" value={headOffice.state} />
                <ReviewField label="Country" value={headOffice.country} />
                <ReviewField label="Pincode" value={headOffice.pincode} />
                <ReviewField label="Phone" value={headOffice.phone} />
                <ReviewField label="Fax" value={headOffice.fax} />
              </div>
            </CardContent>
          </Card>
        )}

      {/* Tax Registration */}
      {taxReg &&
        Object.values(taxReg).some((v) => v) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                Tax Registration Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <ReviewField label="Tax Reg. Nos." value={taxReg.tax_registration_nos} />
                <ReviewField label="TIN No." value={taxReg.tin_no} />
                <ReviewField label="CST No." value={taxReg.cst_no} />
                <ReviewField label="LST No." value={taxReg.lst_no} />
                <ReviewField label="ESIC Reg. No." value={taxReg.esic_reg_no} />
                <ReviewField label="PAN Ref. No." value={taxReg.pan_ref_no} />
                <ReviewField label="PPF No." value={taxReg.ppf_no} />
              </div>
            </CardContent>
          </Card>
        )}

      {/* MSME */}
      {(submission.normalized_msme_registered ||
        submission.normalized_authorized_signatory_name) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              MSME &amp; Signatory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <ReviewField label="MSME Registered" value={submission.normalized_msme_registered} />
              <ReviewField label="MSME Reg. Number" value={submission.normalized_msme_registration_number} />
              <ReviewField label="Enterprise Type" value={submission.normalized_msme_enterprise_type} />
              <ReviewField label="Authorized Signatory" value={submission.normalized_authorized_signatory_name} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Attachments ({attachments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No attachments uploaded.
            </p>
          ) : (
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
                      {att.document_type ? getDocTypeLabel(att.document_type) : "Uncategorized"} — {att.file_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Declaration */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Declaration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            <p>
              I/We hereby declare that the information provided above is true
              and correct to the best of my/our knowledge. I/We undertake to
              inform any changes therein to the organization promptly. I/We
              agree to comply with the organization&apos;s terms and conditions
              and any subsequent amendments thereto.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="declaration_accepted"
              checked={declarationAccepted}
              onChange={(e) => setDeclarationAccepted(e.target.checked)}
              className="rounded border-border mt-0.5"
            />
            <Label
              htmlFor="declaration_accepted"
              className="text-sm font-normal leading-relaxed"
            >
              I confirm that the information provided is accurate and I am
              authorized to submit this form on behalf of the organization.
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isPending}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Attachments
        </Button>
        <Button
          onClick={onFinalize}
          disabled={!declarationAccepted || isPending}
          className="flex-1"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Finalizing…
            </>
          ) : (
            <>
              <Send className="mr-1.5 h-4 w-4" /> Finalize Submission
            </>
          )}
        </Button>
      </div>
      {!declarationAccepted && (
        <p className="text-xs text-center text-muted-foreground">
          Please confirm the declaration above to finalize.
        </p>
      )}
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
          <h1 className="text-xl font-bold text-foreground mb-2">
            Submission Received — Finance Review Started
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your vendor registration has been submitted and has automatically
            entered finance review. Our finance team will review your details
            and may approve or request changes. You will be notified by email
            with the outcome.
          </p>
          <div className="p-4 rounded-lg bg-secondary/30 text-left space-y-1 text-sm text-muted-foreground">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              What happens next
            </p>
            <p>• Our finance team is reviewing your submission automatically</p>
            <p>
              • You&apos;ll receive an email if they need more information or
              have approved your registration
            </p>
            <p>
              • If approved, your vendor account will move to the activation
              stage and you&apos;ll be notified
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VendorOnboardingPage() {
  const { token } = useParams<{ token: string }>();

  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ["v2", "vendor", "public", "invitation", token],
    queryFn: () => getPublicInvitation(token!),
    retry: false,
  });

  const [mode, setMode] = useState<Mode>("loading");
  const [modeReady, setModeReady] = useState(false);
  const [attachments, setAttachments] = useState<OnboardingAttachment[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentSubmission, setCurrentSubmission] =
    useState<VendorOnboardingSubmission | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // After invitation loads: resume only editable submissions.
  useEffect(() => {
    if (!invitation || modeReady || isLoading) return;

    if (
      invitation.status === "cancelled" ||
      invitation.status === "expired"
    ) {
      setModeReady(true);
      return;
    }

    getPublicSubmission(token!)
      .then((s) => {
        setCurrentSubmission(s);
        // Restore any attachments the vendor already uploaded in a previous session.
        if (s.attachments && s.attachments.length > 0) {
          setAttachments(normalizeOnboardingAttachments(
            s.attachments.map((a) => ({
              id: a.id,
              title: a.title,
              file_name: a.file_name,
              document_type: a.document_type,
            }))
          ));
        }
        if (!EDITABLE_SUBMISSION_STATUSES.has(s.status)) {
          setMode("submitted");
          return;
        }
        setMode(s.submission_mode === "excel" ? "review_details" : "manual_details");
      })
      .catch(() => {
        setMode("choose_method");
      })
      .finally(() => setModeReady(true));
  }, [invitation, modeReady, isLoading, token]);

  const submitManualMutation = useMutation({
    mutationFn: (payload: { data: Record<string, unknown>; finalize: boolean }) =>
      submitManual(token!, payload),
  });

  const submitExcelMutation = useMutation({
    mutationFn: (file: File) => submitExcel(token!, file, false),
  });

  const addAttachmentMutation = useMutation({
    mutationFn: ({
      file,
      title,
      documentType,
    }: {
      file: File;
      title: string;
      documentType: string;
    }) => addAttachment(token!, file, title, documentType),
  });

  const removeAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) =>
      removePublicAttachment(token!, attachmentId),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeInvitation(token!),
  });

  // ── Loading / error guards ────────────────────────────────────────────────

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

  if (!modeReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (invitation.status === "cancelled" || invitation.status === "expired") {
    return (
      <InvalidTokenScreen
        message={`This invitation is ${invitation.status}. Please contact the organization for a new invitation.`}
      />
    );
  }

  if (mode === "submitted") {
    return <SubmittedScreen />;
  }

  // ── Choose method screen (pre-stage) ─────────────────────────────────────

  if (mode === "choose_method") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-1">
              <img
                src="/hp.jpg"
                alt="Horizon Industrial Parks"
                className="h-12 w-auto object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Vendor Onboarding
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Complete your registration to start working with us
              </p>
            </div>
            <p className="text-sm font-medium text-primary">
              {invitation.vendor_email}
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose how you would like to complete the Vendor Registration
                Form (VRF).
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => setMode("manual_details")}
                  className="w-full justify-start text-left h-auto py-4"
                  variant="outline"
                >
                  <div className="flex items-start gap-3 w-full">
                    <FileText className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Fill Form Manually</p>
                      <p className="text-xs text-muted-foreground">
                        Complete the VRF as an online form — same fields as the
                        workbook
                      </p>
                    </div>
                  </div>
                </Button>
                <Button
                  onClick={() => setMode("upload_template")}
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

  // ── Staged layout (Details → Attachments → Review & Finalize) ────────────

  const isStageMode = [
    "manual_details",
    "upload_template",
    "review_details",
    "attachments",
    "finalize_review",
  ].includes(mode);

  if (!isStageMode) return null;

  const headerBackAction =
    mode === "manual_details"
      ? {
          onClick: () => {
            setSubmitError(null);
            setMode("choose_method");
          },
        }
      : mode === "upload_template"
      ? {
          onClick: () => {
            setSubmitError(null);
            setMode("choose_method");
          },
        }
      : mode === "review_details"
      ? {
          onClick: () => {
            setSubmitError(null);
            setMode("upload_template");
          },
        }
      : mode === "attachments"
      ? {
          onClick: () => {
            setSubmitError(null);
            setMode(
              currentSubmission?.submission_mode === "excel"
                ? "review_details"
                : "manual_details"
            );
          },
        }
      : mode === "finalize_review"
      ? {
          onClick: () => {
            setSubmitError(null);
            setMode("attachments");
          },
        }
      : null;

  const canChangeMethod =
    mode === "manual_details" || mode === "upload_template";

  return (
    <div className="min-h-screen bg-background">
      <ScrollArea className="h-screen">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Vendor Registration Form
              </h1>
              <p className="text-sm text-muted-foreground">
                {invitation.vendor_email}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerBackAction && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={headerBackAction.onClick}
                  className="gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              {canChangeMethod && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSubmitError(null);
                  setMode("choose_method");
                }}
                className="gap-1 shrink-0"
              >
                ← Change method
              </Button>
              )}
            </div>
          </div>

          {/* Stage indicator */}
          <StageIndicator mode={mode} />

          {/* ── STAGE 1: MANUAL DETAILS ─────────────────────────────────── */}
          {mode === "manual_details" && (
            <ManualStep
              invitation={invitation}
              initialSubmission={
                currentSubmission?.submission_mode === "manual"
                  ? currentSubmission
                  : null
              }
              onSaveDraft={(data) => {
                setSubmitError(null);
                submitManualMutation.mutate(
                  { data, finalize: false },
                  {
                    onSuccess: (sub) => {
                      setCurrentSubmission(sub);
                      setLastSaved(new Date().toLocaleTimeString());
                    },
                    onError: (err) =>
                      setSubmitError(
                        generalApiError(err) ?? "Failed to save draft"
                      ),
                  }
                );
              }}
              onContinue={(data) => {
                setSubmitError(null);
                submitManualMutation.mutate(
                  { data, finalize: false },
                  {
                    onSuccess: (sub) => {
                      setCurrentSubmission(sub);
                      setLastSaved(null);
                      setMode("attachments");
                    },
                    onError: (err) =>
                      setSubmitError(
                        generalApiError(err) ?? "Failed to save"
                      ),
                  }
                );
              }}
              isPending={submitManualMutation.isPending}
              error={submitError}
              showSaveDraft
              continueLabel="Continue to Attachments"
              lastSaved={lastSaved}
            />
          )}

          {/* ── STAGE 1b: UPLOAD TEMPLATE ───────────────────────────────── */}
          {mode === "upload_template" && (
            <UploadTemplateStep
              invitation={invitation}
              onUpload={(file) => {
                setSubmitError(null);
                submitExcelMutation.mutate(file, {
                  onSuccess: (sub) => {
                    setCurrentSubmission(sub);
                    setMode("review_details");
                  },
                  onError: (err) =>
                    setSubmitError(
                      generalApiError(err) ?? "Upload failed"
                    ),
                });
              }}
              isPending={submitExcelMutation.isPending}
              error={submitError}
            />
          )}

          {/* ── STAGE 1c: REVIEW EXTRACTED DETAILS (upload path) ────────── */}
          {mode === "review_details" && (
            <ManualStep
              invitation={invitation}
              initialSubmission={currentSubmission}
              onSaveDraft={() => {/* hidden */}}
              onContinue={(data) => {
                setSubmitError(null);
                submitManualMutation.mutate(
                  { data, finalize: false },
                  {
                    onSuccess: (sub) => {
                      setCurrentSubmission(sub);
                      setMode("attachments");
                    },
                    onError: (err) =>
                      setSubmitError(
                        generalApiError(err) ?? "Failed to save"
                      ),
                  }
                );
              }}
              isPending={submitManualMutation.isPending}
              error={submitError}
              showSaveDraft={false}
              continueLabel="Save & Continue to Attachments"
              topBanner={
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-primary/5 border border-primary/20">
                  <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      VRF Workbook Parsed
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Vendor data has been extracted from your workbook. Review
                      and correct any fields below before continuing.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSubmitError(null);
                      setMode("upload_template");
                    }}
                    className="shrink-0 gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Replace Workbook
                  </Button>
                </div>
              }
            />
          )}

          {/* ── STAGE 2: ATTACHMENTS ────────────────────────────────────── */}
          {mode === "attachments" && (
            <AttachmentsStep
              attachments={attachments}
              onAdd={(file, title, documentType) => {
                setSubmitError(null);
                addAttachmentMutation.mutate(
                  { file, title, documentType },
                  {
                    onSuccess: (attachment) => {
                      setAttachments((prev) => [
                        ...prev.filter((att) => att.document_type !== documentType),
                        {
                          id: attachment.id,
                          title: attachment.title,
                          file_name: attachment.file_name,
                          document_type: attachment.document_type,
                        },
                      ]);
                    },
                    onError: (err) =>
                      setSubmitError(
                        generalApiError(err) ?? "Failed to upload attachment"
                      ),
                  }
                );
              }}
              onRemove={(attachment) => {
                setSubmitError(null);
                removeAttachmentMutation.mutate(attachment.id, {
                  onSuccess: () => {
                    setAttachments((prev) =>
                      prev.filter(
                        (att) => att.document_type !== attachment.document_type
                      )
                    );
                  },
                  onError: (err) =>
                    setSubmitError(
                      generalApiError(err) ?? "Failed to remove attachment"
                    ),
                });
              }}
              onBack={() => {
                setSubmitError(null);
                setMode(
                  currentSubmission?.submission_mode === "excel"
                    ? "review_details"
                    : "manual_details"
                );
              }}
              onContinue={() => {
                setSubmitError(null);
                setMode("finalize_review");
              }}
              isAdding={addAttachmentMutation.isPending}
              isRemoving={removeAttachmentMutation.isPending}
              error={submitError}
              msmeRegistered={currentSubmission?.normalized_msme_registered === true}
            />
          )}

          {/* ── STAGE 3: REVIEW & FINALIZE ──────────────────────────────── */}
          {mode === "finalize_review" && currentSubmission && (
            <FinalizeReviewStep
              submission={currentSubmission}
              attachments={attachments}
              onBack={() => {
                setSubmitError(null);
                setMode("attachments");
              }}
              onFinalize={() => {
                setSubmitError(null);
                finalizeMutation.mutate(undefined, {
                  onSuccess: () => setMode("submitted"),
                  onError: (err) =>
                    setSubmitError(
                      generalApiError(err) ?? "Failed to finalize"
                    ),
                });
              }}
              isPending={finalizeMutation.isPending}
              error={submitError}
            />
          )}

          {mode === "finalize_review" && !currentSubmission && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
