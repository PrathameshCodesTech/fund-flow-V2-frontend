/**
 * VendorRegistrationPage — public-facing vendor self-registration form.
 *
 * Primary path (invite-based):
 *   /vendor/register?token=<uuid>
 *   - Token is validated against GET /api/v1/vendors/invites/validate/
 *   - On success, org and contact email are pre-filled from the invite
 *   - Invalid / expired / used tokens show an error screen; form is not shown
 *   - Submission includes the invite_token so the backend can mark it used
 *
 * Fallback path (org param):
 *   /vendor/register?org=<uuid>
 *   - Org UUID is pre-filled; vendor completes the rest
 *
 * Manual path (no params):
 *   /vendor/register
 *   - Vendor must enter the org UUID manually
 *
 * Collects:
 *  - Company information (step 1)
 *  - Primary bank account (step 2) — sent in `bank_accounts` array
 *  - Documents (step 3, optional) — uploaded via multipart/form-data
 *  - Review & submit (step 4)
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Landmark,
  Shield,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Loader2,
  XCircle,
  FileText,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import {
  createRegistrationRequestWithDocuments,
  type RegistrationDocumentPayload,
} from "@/lib/api/vendors";
import { ApiError } from "@/lib/api/client";
import { useValidateInvite } from "@/lib/hooks/useVendors";

// ── Types ─────────────────────────────────────────────────────────────────────

type RegStep = "company" | "bank" | "documents" | "review" | "submitted";

interface CompanyData {
  vendor_name: string;
  vendor_legal_name: string;
  vendor_tax_id: string;
  vendor_type: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  organization: string;
}

interface BankData {
  account_name: string;
  bank_name: string;
  account_number: string;
  routing_number: string;
  swift_code: string;
  iban: string;
  currency: string;
  country: string;
}

interface DocumentData {
  document_type: string;
  name: string;
  file: File | null;
  expiry_date: string;
  notes: string;
}

const DOCUMENT_TYPES = [
  { value: "business_license", label: "Business License" },
  { value: "tax_certificate", label: "Tax Certificate (GST/VAT)" },
  { value: "address_proof", label: "Address Proof" },
  { value: "identity_proof", label: "Identity Proof (PAN/ID)" },
  { value: "bank_letter", label: "Bank Letter / Canceled Cheque" },
  { value: "insurance_certificate", label: "Insurance Certificate" },
  { value: "contract_agreement", label: "Contract / Agreement" },
  { value: "iso_certification", label: "ISO Certification" },
  { value: "other", label: "Other" },
];

const initialDocument = (): DocumentData => ({
  document_type: "",
  name: "",
  file: null,
  expiry_date: "",
  notes: "",
});

const initialCompany: CompanyData = {
  vendor_name: "",
  vendor_legal_name: "",
  vendor_tax_id: "",
  vendor_type: "supplier",
  contact_email: "",
  contact_phone: "",
  notes: "",
  organization: "",
};

const initialBank: BankData = {
  account_name: "",
  bank_name: "",
  account_number: "",
  routing_number: "",
  swift_code: "",
  iban: "",
  currency: "INR",
  country: "IN",
};

// ── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({
  current,
  steps,
}: {
  current: number;
  steps: { label: string; icon: typeof Building2 }[];
}) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center flex-1">
          <div
            className={`flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-xs font-medium transition-all ${
              i === current
                ? "bg-primary text-primary-foreground"
                : i < current
                ? "bg-success/10 text-success"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <s.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <ArrowRight className="w-4 h-4 text-muted-foreground mx-1 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Input Field ───────────────────────────────────────────────────────────────

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

// ── Review Row ────────────────────────────────────────────────────────────────

function ReviewSection({
  title,
  items,
}: {
  title: string;
  items: [string, string][];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4">
            <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
            <span className="text-sm font-medium text-foreground text-right break-all">
              {value || "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VendorRegistrationPage() {
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get("token") ?? "";
  const orgFromQuery = searchParams.get("org") ?? "";

  // If a token is present, validate it before showing the form.
  const {
    data: inviteData,
    isLoading: inviteLoading,
    error: inviteError,
  } = useValidateInvite(tokenFromQuery || null);

  // Org resolved from invite token (preferred) or ?org= param
  const effectiveOrg = inviteData?.organization_id ?? orgFromQuery;

  const [step, setStep] = useState<RegStep>("company");
  const [company, setCompany] = useState<CompanyData>(initialCompany);
  const [bank, setBank] = useState<BankData>({ ...initialBank });
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Once invite data resolves, seed org + contact email into the form.
  // This runs once when inviteData first becomes available.
  useEffect(() => {
    if (!inviteData) return;
    setCompany(prev => ({
      ...prev,
      organization: inviteData.organization_id,
      contact_email: inviteData.contact_email || prev.contact_email,
    }));
  }, [inviteData]);

  // Seed org from ?org= param when no token is present
  useEffect(() => {
    if (tokenFromQuery || !orgFromQuery) return;
    setCompany(prev => ({ ...prev, organization: orgFromQuery }));
  }, [orgFromQuery, tokenFromQuery]);

  const stepIndex: Record<RegStep, number> = {
    company: 0,
    bank: 1,
    documents: 2,
    review: 3,
    submitted: 4,
  };

  const updateCompany = (field: keyof CompanyData) => (v: string) => {
    setCompany((prev) => ({ ...prev, [field]: v }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    setGeneralError(null);
  };

  const updateBank = (field: keyof BankData) => (v: string) => {
    setBank((prev) => ({ ...prev, [field]: v }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    setGeneralError(null);
  };

  const validateCompany = (): boolean => {
    const errs: Record<string, string> = {};
    if (!company.vendor_name.trim()) errs.vendor_name = "Company name is required";
    if (!company.contact_email.trim() || !company.contact_email.includes("@"))
      errs.contact_email = "Valid email is required";
    if (!company.contact_phone.trim()) errs.contact_phone = "Phone number is required";
    if (!company.organization.trim()) errs.organization = "Organization ID is required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateBank = (): boolean => {
    const errs: Record<string, string> = {};
    if (!bank.account_name.trim()) errs.account_name = "Account holder name is required";
    if (!bank.bank_name.trim()) errs.bank_name = "Bank name is required";
    if (!bank.account_number.trim()) errs.account_number = "Account number is required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setGeneralError(null);
    setFieldErrors({});

    // Build bank_accounts array (always primary since it's the only one submitted)
    const bankPayload = {
      account_name: bank.account_name.trim(),
      bank_name: bank.bank_name.trim(),
      account_number: bank.account_number.trim(),
      routing_number: bank.routing_number.trim() || undefined,
      swift_code: bank.swift_code.trim() || undefined,
      iban: bank.iban.trim() || undefined,
      currency: bank.currency.trim() || "INR",
      country: bank.country.trim() || "IN",
      is_primary: true,
      is_active: true,
    };

    try {
      // Collect valid documents (must have a file selected)
      const validDocs: RegistrationDocumentPayload[] = documents
        .filter(d => d.file !== null && d.document_type && d.name)
        .map(d => ({
          document_type: d.document_type,
          name: d.name,
          file: d.file!,
          expiry_date: d.expiry_date || undefined,
          notes: d.notes || undefined,
        }));

      if (validDocs.length > 0) {
        // Submit with documents via multipart
        await createRegistrationRequestWithDocuments(
          {
            organization: company.organization.trim(),
            vendor_name: company.vendor_name.trim(),
            vendor_legal_name: company.vendor_legal_name.trim(),
            vendor_tax_id: company.vendor_tax_id.trim(),
            vendor_type: company.vendor_type,
            contact_email: company.contact_email.trim(),
            contact_phone: company.contact_phone.trim(),
            notes: company.notes.trim(),
            bank_accounts: [bankPayload],
            ...(tokenFromQuery ? { invite_token: tokenFromQuery } : {}),
          },
          validDocs,
        );
      } else {
        // Fallback: no documents — use plain JSON submit
        const { createRegistrationRequest } = await import("@/lib/api/vendors");
        await createRegistrationRequest({
          organization: company.organization.trim(),
          vendor_name: company.vendor_name.trim(),
          vendor_legal_name: company.vendor_legal_name.trim(),
          vendor_tax_id: company.vendor_tax_id.trim(),
          vendor_type: company.vendor_type,
          contact_email: company.contact_email.trim(),
          contact_phone: company.contact_phone.trim(),
          notes: company.notes.trim(),
          bank_accounts: [bankPayload] as never,
          ...(tokenFromQuery ? { invite_token: tokenFromQuery } : {}),
        } as never);
      }
      setStep("submitted");
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrs: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.errors)) {
          if (field === "detail" || field === "non_field_errors") continue;
          if (Array.isArray(messages) && messages.length) {
            fieldErrs[field] = messages[0];
          }
        }
        if (Object.keys(fieldErrs).length > 0) {
          setFieldErrors(fieldErrs);
          setStep("company");
        } else {
          setGeneralError(
            err.errors["detail"]?.[0] ??
            err.errors["non_field_errors"]?.[0] ??
            "Submission failed. Please try again."
          );
        }
      } else {
        setGeneralError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const VENDOR_TYPES = ["supplier", "agency", "contractor", "other"];
  const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

  const steps = [
    { label: "Company Info", icon: Building2 },
    { label: "Bank Account", icon: Landmark },
    { label: "Documents", icon: FileText },
    { label: "Review", icon: Shield },
    { label: "Submitted", icon: CheckCircle2 },
  ];

  const header = (
    <header className="sticky top-0 z-20 bg-card border-b border-border px-4 sm:px-6 py-3">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">MF</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Vendor Registration</p>
          {inviteData ? (
            <p className="text-caption">{inviteData.organization_name}</p>
          ) : (
            <p className="text-caption">MarketFund Governance Suite</p>
          )}
        </div>
      </div>
    </header>
  );

  // ── Token validation gate ─────────────────────────────────────────────────
  if (tokenFromQuery && inviteLoading) {
    return (
      <div className="min-h-screen bg-background">
        {header}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validating your invitation…</p>
        </main>
      </div>
    );
  }

  // No token and no org param — block with an invitation-required screen.
  // This is a hard dead-end: the vendor cannot self-register without an invite.
  if (!tokenFromQuery && !orgFromQuery) {
    return (
      <div className="min-h-screen bg-background">
        {header}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <div className="widget-card text-center py-12">
            <Shield className="w-14 h-14 text-primary mx-auto mb-4 opacity-60" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Invitation Required</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Vendor registration is by invitation only. Please use the registration link you received from the organization you are working with.
            </p>
            <p className="text-caption mt-3">
              If you believe you received this page in error, contact that organization's administrator.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (tokenFromQuery && inviteError) {
    const msg = inviteError instanceof ApiError
      ? (inviteError.errors?.detail?.[0] ?? inviteError.message)
      : "This invitation link is invalid or has expired.";
    return (
      <div className="min-h-screen bg-background">
        {header}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <div className="widget-card text-center py-12">
            <XCircle className="w-14 h-14 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Invitation Invalid</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">{msg}</p>
            <p className="text-caption mt-3">
              Please contact the organization that sent you this link to request a new invitation.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {header}

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <StepIndicator current={stepIndex[step]} steps={steps} />

        {generalError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-destructive/5 border border-destructive/20"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{generalError}</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* ── Step 1: Company Info ─────────────────────────────────────────── */}
          {step === "company" && (
            <motion.div
              key="company"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="widget-card">
                <h2 className="text-card-title mb-1">Company Information</h2>
                <p className="text-caption mb-6">Enter your organisation and contact details</p>

                <div className="space-y-4">
                  {/* Normal path: invite token pre-fills everything — no manual org entry needed */}
                  {!tokenFromQuery && !orgFromQuery && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                      <p className="font-medium mb-1">An invitation is required to register.</p>
                      <p className="text-xs text-muted-foreground">
                        Please use the registration link you received from the organization you are working with.
                        If you believe you received this page in error, contact that organization's administrator.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <InputField
                        label="Company / Firm Name"
                        value={company.vendor_name}
                        onChange={updateCompany("vendor_name")}
                        placeholder="e.g. Zenith Media Pvt Ltd"
                        required
                        error={fieldErrors.vendor_name}
                      />
                    </div>
                    <InputField
                      label="Legal / Registered Name"
                      value={company.vendor_legal_name}
                      onChange={updateCompany("vendor_legal_name")}
                      placeholder="Registered legal name"
                      error={fieldErrors.vendor_legal_name}
                    />
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Vendor Type
                      </label>
                      <select
                        value={company.vendor_type}
                        onChange={(e) => updateCompany("vendor_type")(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      >
                        {VENDOR_TYPES.map((t) => (
                          <option key={t} value={t} className="capitalize">
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      label="Contact Email"
                      value={company.contact_email}
                      onChange={updateCompany("contact_email")}
                      placeholder="name@company.com"
                      type="email"
                      required
                      error={fieldErrors.contact_email}
                    />
                    <InputField
                      label="Contact Phone"
                      value={company.contact_phone}
                      onChange={updateCompany("contact_phone")}
                      placeholder="+91 98765 43210"
                      required
                      error={fieldErrors.contact_phone}
                    />
                  </div>

                  <InputField
                    label="Tax ID (GST / VAT / TIN)"
                    value={company.vendor_tax_id}
                    onChange={(v) => updateCompany("vendor_tax_id")(v.toUpperCase())}
                    placeholder="27AAACZ1234F1Z5"
                    error={fieldErrors.vendor_tax_id}
                  />

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Additional Notes
                    </label>
                    <textarea
                      value={company.notes}
                      onChange={(e) => updateCompany("notes")(e.target.value)}
                      placeholder="Any additional information for the reviewer…"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => validateCompany() && setStep("bank")}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-soft"
                  >
                    Next: Bank Account <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Bank Account ─────────────────────────────────────────── */}
          {step === "bank" && (
            <motion.div
              key="bank"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="widget-card">
                <h2 className="text-card-title mb-1">Primary Bank Account</h2>
                <p className="text-caption mb-6">
                  Provide the bank account details for payment disbursement
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <InputField
                        label="Account Holder Name"
                        value={bank.account_name}
                        onChange={updateBank("account_name")}
                        placeholder="Name on the bank account"
                        required
                        error={fieldErrors.account_name}
                      />
                    </div>
                    <InputField
                      label="Bank Name"
                      value={bank.bank_name}
                      onChange={updateBank("bank_name")}
                      placeholder="e.g. HDFC Bank"
                      required
                      error={fieldErrors.bank_name}
                    />
                    <InputField
                      label="Account Number"
                      value={bank.account_number}
                      onChange={updateBank("account_number")}
                      placeholder="Account number"
                      required
                      error={fieldErrors.account_number}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      label="Routing / IFSC Code"
                      value={bank.routing_number}
                      onChange={updateBank("routing_number")}
                      placeholder="e.g. HDFC0001234"
                      error={fieldErrors.routing_number}
                    />
                    <InputField
                      label="SWIFT / BIC Code"
                      value={bank.swift_code}
                      onChange={updateBank("swift_code")}
                      placeholder="e.g. HDFCINBB"
                      error={fieldErrors.swift_code}
                    />
                  </div>

                  <InputField
                    label="IBAN (if applicable)"
                    value={bank.iban}
                    onChange={updateBank("iban")}
                    placeholder="International Bank Account Number"
                    error={fieldErrors.iban}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Currency <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={bank.currency}
                        onChange={(e) => updateBank("currency")(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <InputField
                      label="Country Code"
                      value={bank.country}
                      onChange={(v) => updateBank("country")(v.toUpperCase())}
                      placeholder="e.g. IN, US, GB"
                      error={fieldErrors.country}
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => { setGeneralError(null); setStep("company"); }}
                    className="px-6 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => validateBank() && setStep("documents")}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-soft"
                  >
                    Next: Documents <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Documents ─────────────────────────────────────────────── */}
          {step === "documents" && (
            <motion.div
              key="documents"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="widget-card">
                <h2 className="text-card-title mb-1">Supporting Documents</h2>
                <p className="text-caption mb-1">
                  Upload business compliance documents such as licenses, certificates,
                  or tax documents. This step is optional — you may skip it.
                </p>
                <p className="text-caption mb-6 text-muted-foreground">
                  Accepted formats: PDF, JPG, PNG, DOC — max 10 MB per file.
                </p>

                {documents.length === 0 && (
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center mb-6">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No documents added yet
                    </p>
                    <p className="text-caption mt-1">
                      Click "Add Document" below to upload your first file
                    </p>
                  </div>
                )}

                {documents.map((doc, i) => (
                  <div key={i} className="mb-4 p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Document {i + 1}
                      </p>
                      <button
                        onClick={() => setDocuments(prev => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">
                          Document Type <span className="text-destructive">*</span>
                        </label>
                        <select
                          value={doc.document_type}
                          onChange={e => {
                            const updated = [...documents];
                            updated[i] = { ...updated[i], document_type: e.target.value };
                            setDocuments(updated);
                          }}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        >
                          <option value="">Select type…</option>
                          {DOCUMENT_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      <InputField
                        label="Document Name / Title"
                        value={doc.name}
                        onChange={v => {
                          const updated = [...documents];
                          updated[i] = { ...updated[i], name: v };
                          setDocuments(updated);
                        }}
                        placeholder="e.g. GST Registration Certificate"
                      />

                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">
                          File <span className="text-destructive">*</span>
                        </label>
                        {doc.file ? (
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
                            <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{doc.file.name}</p>
                              <p className="text-caption">
                                {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                const updated = [...documents];
                                updated[i] = { ...updated[i], file: null };
                                setDocuments(updated);
                              }}
                              className="text-muted-foreground hover:text-destructive flex-shrink-0"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors bg-secondary/20">
                            <Upload className="w-5 h-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Click to browse or drag file here
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 10 * 1024 * 1024) {
                                  setGeneralError("File size must be under 10 MB.");
                                  return;
                                }
                                const updated = [...documents];
                                updated[i] = { ...updated[i], file };
                                // Auto-fill name from filename if empty
                                if (!updated[i].name) {
                                  updated[i] = {
                                    ...updated[i],
                                    name: file.name.replace(/\.[^/.]+$/, ""),
                                  };
                                }
                                setDocuments(updated);
                              }}
                            />
                          </label>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InputField
                          label="Expiry Date"
                          value={doc.expiry_date}
                          onChange={v => {
                            const updated = [...documents];
                            updated[i] = { ...updated[i], expiry_date: v };
                            setDocuments(updated);
                          }}
                          type="date"
                          placeholder="YYYY-MM-DD"
                        />
                        <InputField
                          label="Notes"
                          value={doc.notes}
                          onChange={v => {
                            const updated = [...documents];
                            updated[i] = { ...updated[i], notes: v };
                            setDocuments(updated);
                          }}
                          placeholder="Optional notes…"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setDocuments(prev => [...prev, initialDocument()])}
                  className="flex items-center gap-2 text-sm text-primary hover:underline mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add another document
                </button>

                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => { setGeneralError(null); setStep("bank"); }}
                    className="px-6 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep("review")}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-soft"
                  >
                    Next: Review <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Review ────────────────────────────────────────────────── */}
          {step === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="widget-card">
                <h2 className="text-card-title mb-1">Review & Submit</h2>
                <p className="text-caption mb-6">Please verify all information before submitting</p>

                <div className="space-y-5">
                  <ReviewSection
                    title="Company"
                    items={[
                      ["Company Name", company.vendor_name],
                      ["Legal Name", company.vendor_legal_name],
                      ["Vendor Type", company.vendor_type],
                      ["Tax ID", company.vendor_tax_id],
                    ]}
                  />
                  <ReviewSection
                    title="Contact"
                    items={[
                      ["Email", company.contact_email],
                      ["Phone", company.contact_phone],
                    ]}
                  />
                  <ReviewSection
                    title="Primary Bank Account"
                    items={[
                      ["Account Holder", bank.account_name],
                      ["Bank", bank.bank_name],
                      ["Account Number", bank.account_number],
                      ["IFSC / Routing", bank.routing_number],
                      ["SWIFT", bank.swift_code],
                      ["Currency", bank.currency],
                    ]}
                  />
                  {company.notes && (
                    <ReviewSection
                      title="Notes"
                      items={[["Notes", company.notes]]}
                    />
                  )}

                  {/* Documents summary */}
                  {documents.filter(d => d.file !== null).length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Documents ({documents.filter(d => d.file !== null).length})
                      </h3>
                      <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
                        {documents.filter(d => d.file !== null).map((doc, i) => (
                          <div key={i} className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label ?? doc.document_type}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-foreground">{doc.name || "—"}</p>
                              {doc.file && (
                                <p className="text-caption">{(doc.file.size / 1024 / 1024).toFixed(2)} MB</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {documents.filter(d => d.file !== null).length === 0 && (
                    <div className="p-3 rounded-xl bg-secondary/20 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        No documents attached — registration will be submitted without supporting documents.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => { setGeneralError(null); setStep("bank"); }}
                    className="px-6 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-success text-success-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-soft disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" /> Submit for Verification
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Submitted ─────────────────────────────────────────────── */}
          {step === "submitted" && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="widget-card text-center py-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                >
                  <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
                </motion.div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Registration Submitted!
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Your vendor registration for{" "}
                  <strong>{company.vendor_name}</strong> has been submitted for
                  verification. Our team will review your details within 2–3
                  business days.
                </p>
                <div className="mt-6 p-4 rounded-xl bg-info/5 border border-info/20 max-w-sm mx-auto">
                  <p className="text-sm text-info font-medium">What happens next?</p>
                  <ul className="text-caption mt-2 space-y-1 text-left">
                    <li>You will receive a confirmation email shortly</li>
                    <li>The admin team will verify your tax ID and bank details</li>
                    <li>You will be notified by email once your registration is reviewed</li>
                    <li>If approved, an admin will contact you to set up portal access</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setStep("company");
                    setCompany({ ...initialCompany, organization: effectiveOrg });
                    setBank({ ...initialBank });
                    setDocuments([]);
                    setFieldErrors({});
                    setGeneralError(null);
                  }}
                  className="mt-6 px-6 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Submit another registration
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
