import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import {
  Search,
  Building2,
  Phone,
  Mail,
  Plus,
  X,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Pencil,
  ShieldAlert,
} from "lucide-react";
import {
  useVendors,
  useCreateVendor,
  useUpdateVendor,
  useRegistrations,
  useApproveRegistration,
  useRejectRegistration,
  useVendorBankAccounts,
  useCreateBankAccount,
  useDeactivateBankAccount,
} from "@/lib/hooks/useVendors";
import { useAuth } from "@/contexts/AuthContext";
import {
  canViewVendor,
  canCreateVendor,
  canManageVendor,
} from "@/lib/capabilities";
import { ApiError } from "@/lib/api/client";
import type { Vendor, VendorBankAccount, VendorRegistrationRequest } from "@/lib/types/vendors";

// ── Helpers ───────────────────────────────────────────────────────────────────

function vendorInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function extractApiErrors(err: unknown): Record<string, string> {
  if (err instanceof ApiError) {
    const out: Record<string, string> = {};
    for (const [field, messages] of Object.entries(err.errors)) {
      if (Array.isArray(messages) && messages.length) {
        out[field] = messages[0];
      }
    }
    return out;
  }
  return {};
}

function generalErrorMessage(err: unknown): string | null {
  if (err instanceof ApiError) {
    return (
      err.errors["detail"]?.[0] ??
      err.errors["non_field_errors"]?.[0] ??
      null
    );
  }
  return err ? "An unexpected error occurred." : null;
}

const VENDOR_TYPES = ["supplier", "agency", "contractor", "other"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success text-success-foreground",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-warning text-warning-foreground",
  blacklisted: "bg-destructive text-destructive-foreground",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}

const REG_STATUS_COLORS: Record<string, string> = {
  submitted: "bg-primary/10 text-primary",
  under_review: "bg-warning/10 text-warning-foreground",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  draft: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

function RegStatusBadge({ status }: { status: string }) {
  const cls = REG_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ── Input Field ───────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  mono = false,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${mono ? "font-mono" : ""} ${className}`}
    />
  );
}

// ── Vendor Form (shared by create and edit) ───────────────────────────────────

interface VendorFormData {
  name: string;
  legal_name: string;
  email: string;
  phone: string;
  tax_id: string;
  vendor_type: string;
  code: string;
}

const emptyVendorForm: VendorFormData = {
  name: "",
  legal_name: "",
  email: "",
  phone: "",
  tax_id: "",
  vendor_type: "supplier",
  code: "",
};

function VendorFormFields({
  form,
  errors,
  onChange,
  showCode = true,
}: {
  form: VendorFormData;
  errors: Record<string, string>;
  onChange: (key: keyof VendorFormData, val: string) => void;
  showCode?: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Vendor Name *" error={errors.name}>
          <TextInput value={form.name} onChange={(v) => onChange("name", v)} placeholder="e.g. Zenith Media" />
        </Field>
        <Field label="Legal Name" error={errors.legal_name}>
          <TextInput value={form.legal_name} onChange={(v) => onChange("legal_name", v)} placeholder="Registered legal name" />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Contact Email *" error={errors.email}>
          <TextInput type="email" value={form.email} onChange={(v) => onChange("email", v)} placeholder="contact@company.com" />
        </Field>
        <Field label="Contact Phone *" error={errors.phone}>
          <TextInput value={form.phone} onChange={(v) => onChange("phone", v)} placeholder="+91 98765 43210" />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Tax ID (GST/VAT/TIN)" error={errors.tax_id}>
          <TextInput value={form.tax_id} onChange={(v) => onChange("tax_id", v.toUpperCase())} placeholder="27AAACZ1234F1Z5" mono />
        </Field>
        <Field label="Vendor Type" error={errors.vendor_type}>
          <select
            value={form.vendor_type}
            onChange={(e) => onChange("vendor_type", e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          >
            {VENDOR_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {showCode && (
        <Field label="Vendor Code (optional — auto-generated if blank)" error={errors.code}>
          <TextInput value={form.code} onChange={(v) => onChange("code", v)} placeholder="e.g. VEN-00042" mono />
        </Field>
      )}
    </>
  );
}

// ── Create Vendor Dialog ──────────────────────────────────────────────────────

function CreateVendorDialog({
  open,
  onClose,
  organizationId,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string | null;
}) {
  const { createVendor, isCreating, createError } = useCreateVendor();
  const [form, setForm] = useState<VendorFormData>(emptyVendorForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onChange = (key: keyof VendorFormData, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Vendor name is required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ve = validate();
    if (Object.keys(ve).length > 0) { setErrors(ve); return; }

    try {
      await createVendor({
        ...(organizationId ? { organization: organizationId } : {}),
        name: form.name.trim(),
        legal_name: form.legal_name.trim() || form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        tax_id: form.tax_id.trim(),
        vendor_type: form.vendor_type,
        ...(form.code.trim() ? { code: form.code.trim() } : {}),
        status: "active",
      } as Partial<Vendor>);
      setForm(emptyVendorForm);
      setErrors({});
      onClose();
    } catch (err) {
      setErrors(extractApiErrors(err));
    }
  };

  const generalError = generalErrorMessage(createError);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-card rounded-2xl shadow-lg border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto z-10"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Add New Partner</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <VendorFormFields form={form} errors={errors} onChange={onChange} showCode />

          {generalError && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {generalError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isCreating}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-soft disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isCreating ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Add Partner"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Edit Vendor Dialog ────────────────────────────────────────────────────────

function EditVendorDialog({
  vendor,
  onClose,
}: {
  vendor: Vendor;
  onClose: () => void;
}) {
  const { updateVendor, isUpdating, updateError } = useUpdateVendor();
  const [form, setForm] = useState<VendorFormData>({
    name: vendor.name ?? "",
    legal_name: vendor.legal_name ?? "",
    email: vendor.email ?? "",
    phone: vendor.phone ?? "",
    tax_id: vendor.tax_id ?? "",
    vendor_type: vendor.vendor_type ?? "supplier",
    code: vendor.code ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onChange = (key: keyof VendorFormData, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Vendor name is required";
    if (form.email.trim() && !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ve = validate();
    if (Object.keys(ve).length > 0) { setErrors(ve); return; }

    try {
      await updateVendor({
        id: vendor.id,
        data: {
          name: form.name.trim(),
          legal_name: form.legal_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          tax_id: form.tax_id.trim(),
          vendor_type: form.vendor_type,
          // code is intentionally read-only after creation per business rules
        },
      });
      setErrors({});
      onClose();
    } catch (err) {
      setErrors(extractApiErrors(err));
    }
  };

  const generalError = generalErrorMessage(updateError);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-card rounded-2xl shadow-lg border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto z-10"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Edit Partner</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Code: {vendor.code} · Org: {vendor.organization_name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <VendorFormFields form={form} errors={errors} onChange={onChange} showCode={false} />

          {generalError && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {generalError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isUpdating}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-soft disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isUpdating ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Bank Account Panel ────────────────────────────────────────────────────────

const emptyBankForm = {
  account_name: "",
  bank_name: "",
  account_number: "",
  routing_number: "",
  iban: "",
  currency: "INR",
  is_primary: false,
};

function BankAccountPanel({
  vendor,
  canManage,
}: {
  vendor: Vendor;
  canManage: boolean;
}) {
  const { bankAccounts, isLoading } = useVendorBankAccounts(vendor.id);
  const { createBankAccount, isCreating, createError } = useCreateBankAccount(vendor.id);
  const { deactivateBankAccount } = useDeactivateBankAccount(vendor.id);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyBankForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onChange = (key: string, val: string | boolean) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const ve: Record<string, string> = {};
    if (!form.account_name.trim()) ve.account_name = "Account name is required";
    if (!form.account_number.trim()) ve.account_number = "Account number is required";
    if (Object.keys(ve).length > 0) { setErrors(ve); return; }

    try {
      await createBankAccount(form as Partial<VendorBankAccount>);
      setForm(emptyBankForm);
      setShowForm(false);
      setErrors({});
    } catch (err) {
      setErrors(extractApiErrors(err));
    }
  };

  const handleDeactivate = async (accountId: string) => {
    if (!window.confirm("Deactivate this bank account?")) return;
    try {
      await deactivateBankAccount(accountId);
    } catch {
      // silently ignore — will refetch
    }
  };

  const generalError = generalErrorMessage(createError);

  return (
    <div className="pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bank Accounts</p>
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>

      {isLoading && (
        <div className="text-xs text-muted-foreground">Loading…</div>
      )}

      {!isLoading && bankAccounts.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No bank accounts recorded.</p>
      )}

      {bankAccounts.map((ba) => (
        <div key={ba.id} className="flex items-start justify-between py-1.5 border-b border-border/50 last:border-0">
          <div>
            <p className="text-xs font-medium text-foreground">
              {ba.bank_name || "Bank"} ···{ba.account_number.slice(-4)}
              {ba.is_primary && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">Primary</span>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground">{ba.account_name} · {ba.currency}</p>
          </div>
          {canManage && (
            <button
              onClick={() => handleDeactivate(ba.id)}
              className="text-[11px] text-destructive hover:underline ml-2 flex-shrink-0"
            >
              Deactivate
            </button>
          )}
        </div>
      ))}

      {showForm && canManage && (
        <form onSubmit={handleAdd} className="mt-3 space-y-3 p-3 rounded-xl bg-secondary/20 border border-border">
          <p className="text-xs font-semibold text-foreground">New Bank Account</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Account Name *" error={errors.account_name}>
              <TextInput value={form.account_name} onChange={(v) => onChange("account_name", v)} placeholder="Account holder name" />
            </Field>
            <Field label="Bank Name" error={errors.bank_name}>
              <TextInput value={form.bank_name} onChange={(v) => onChange("bank_name", v)} placeholder="HDFC Bank" />
            </Field>
            <Field label="Account Number *" error={errors.account_number}>
              <TextInput value={form.account_number} onChange={(v) => onChange("account_number", v)} placeholder="Account number" mono />
            </Field>
            <Field label="IFSC / Routing" error={errors.routing_number}>
              <TextInput value={form.routing_number} onChange={(v) => onChange("routing_number", v)} placeholder="HDFC0001234" mono />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <input
              id={`ba-primary-${vendor.id}`}
              type="checkbox"
              checked={form.is_primary}
              onChange={(e) => onChange("is_primary", e.target.checked)}
              className="rounded"
            />
            <label htmlFor={`ba-primary-${vendor.id}`} className="text-xs text-foreground cursor-pointer">
              Mark as primary
            </label>
          </div>

          {generalError && (
            <p className="text-xs text-destructive">{generalError}</p>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowForm(false); setErrors({}); }}
              className="flex-1 py-2 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isCreating}
              className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-1.5">
              {isCreating ? <><Loader2 className="w-3 h-3 animate-spin" /> Adding…</> : "Add Account"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function VendorCardSkeleton() {
  return (
    <div className="widget-card animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-muted rounded w-3/5" />
          <div className="h-3 bg-muted rounded w-2/5" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <div className="h-3 bg-muted rounded w-2/3" />
          <div className="h-3.5 bg-muted rounded w-1/2" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 bg-muted rounded w-2/3" />
          <div className="h-3.5 bg-muted rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

// ── Vendor Card ───────────────────────────────────────────────────────────────

function VendorCard({
  vendor,
  expanded,
  onToggle,
  canManage,
  onEdit,
}: {
  vendor: Vendor;
  expanded: boolean;
  onToggle: () => void;
  canManage: boolean;
  onEdit: () => void;
}) {
  const primaryBankAccount = vendor.bank_accounts?.find((ba) => ba.is_primary) ?? vendor.bank_accounts?.[0];

  return (
    <div className="widget-card">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-sm font-semibold text-primary">{vendorInitials(vendor.name)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">{vendor.name}</span>
            <StatusBadge status={vendor.status} />
            {canManage && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                title="Edit vendor"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-caption truncate">{vendor.code} · {vendor.vendor_type || "vendor"}</p>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <p className="text-caption">Tax ID</p>
          <p className="text-sm font-medium text-foreground font-mono truncate">{vendor.tax_id || "—"}</p>
        </div>
        <div>
          <p className="text-caption">Primary Bank</p>
          <p className="text-sm font-medium text-foreground truncate">
            {primaryBankAccount
              ? `${primaryBankAccount.bank_name || "Bank"} ···${primaryBankAccount.account_number.slice(-4)}`
              : "—"}
          </p>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={onToggle}
        className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Less</> : <><ChevronDown className="w-3.5 h-3.5" /> Details & Bank Accounts</>}
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-1.5">
              {vendor.legal_name && (
                <div className="flex items-center gap-2 text-caption">
                  <Building2 className="w-3.5 h-3.5" /> {vendor.legal_name}
                </div>
              )}
              {vendor.email && (
                <div className="flex items-center gap-2 text-caption">
                  <Mail className="w-3.5 h-3.5" /> {vendor.email}
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-2 text-caption">
                  <Phone className="w-3.5 h-3.5" /> {vendor.phone}
                </div>
              )}
            </div>
            <div className="mt-3">
              <BankAccountPanel vendor={vendor} canManage={canManage} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Registration Review Section ───────────────────────────────────────────────

function ApproveDialog({
  registration,
  onClose,
}: {
  registration: VendorRegistrationRequest;
  onClose: () => void;
}) {
  const { approveRegistration, isApproving, approveError } = useApproveRegistration();
  const [vendorCode, setVendorCode] = useState("");

  const handleApprove = async () => {
    try {
      await approveRegistration({ id: registration.id, payload: { vendor_code: vendorCode.trim() || undefined } });
      onClose();
    } catch {
      // error shown below
    }
  };

  const generalError = generalErrorMessage(approveError);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card rounded-2xl shadow-lg border border-border w-full max-w-sm z-10 p-6"
      >
        <h3 className="text-base font-semibold text-foreground mb-1">Approve Registration</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Vendor: <strong>{registration.vendor_name}</strong> · Org: {registration.organization_name}
        </p>
        <Field label="Vendor Code (optional — auto-generated if blank)">
          <TextInput value={vendorCode} onChange={setVendorCode} placeholder="VEN-00042" mono />
        </Field>
        {generalError && (
          <p className="text-xs text-destructive mt-2">{generalError}</p>
        )}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button onClick={handleApprove} disabled={isApproving}
            className="flex-1 py-2.5 rounded-xl bg-success text-success-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
            {isApproving ? <><Loader2 className="w-4 h-4 animate-spin" /> Approving…</> : <><CheckCircle2 className="w-4 h-4" /> Approve</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function RejectDialog({
  registration,
  onClose,
}: {
  registration: VendorRegistrationRequest;
  onClose: () => void;
}) {
  const { rejectRegistration, isRejecting, rejectError } = useRejectRegistration();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const handleReject = async () => {
    if (!reason.trim()) { setReasonError("Rejection reason is required."); return; }
    try {
      await rejectRegistration({ id: registration.id, reason: reason.trim() });
      onClose();
    } catch {
      // error shown below
    }
  };

  const generalError = generalErrorMessage(rejectError);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card rounded-2xl shadow-lg border border-border w-full max-w-sm z-10 p-6"
      >
        <h3 className="text-base font-semibold text-foreground mb-1">Reject Registration</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Vendor: <strong>{registration.vendor_name}</strong>
        </p>
        <Field label="Rejection Reason *" error={reasonError}>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); setReasonError(""); }}
            placeholder="Explain why this registration is being rejected…"
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          />
        </Field>
        {generalError && (
          <p className="text-xs text-destructive mt-1">{generalError}</p>
        )}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button onClick={handleReject} disabled={isRejecting}
            className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
            {isRejecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Rejecting…</> : <><XCircle className="w-4 h-4" /> Reject</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function RegistrationReviewSection() {
  const { registrations, isLoading, error } = useRegistrations({ status: "submitted" });
  const [approveTarget, setApproveTarget] = useState<VendorRegistrationRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<VendorRegistrationRequest | null>(null);

  const errorMsg = generalErrorMessage(error);

  if (isLoading) {
    return (
      <div className="widget-card animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-3" />
        <div className="space-y-2">
          {[0, 1].map((i) => <div key={i} className="h-12 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {approveTarget && (
          <ApproveDialog registration={approveTarget} onClose={() => setApproveTarget(null)} />
        )}
        {rejectTarget && (
          <RejectDialog registration={rejectTarget} onClose={() => setRejectTarget(null)} />
        )}
      </AnimatePresence>

      <div className="widget-card">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-4 h-4 text-warning" />
          <h2 className="text-sm font-semibold text-foreground">Pending Registrations</h2>
          {registrations.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-semibold">
              {registrations.length}
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-destructive text-xs mb-3">
            <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
          </div>
        )}

        {registrations.length === 0 && !errorMsg && (
          <p className="text-xs text-muted-foreground italic">No pending registration requests.</p>
        )}

        <div className="space-y-2">
          {registrations.map((reg) => (
            <div key={reg.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{reg.vendor_name}</p>
                  <RegStatusBadge status={reg.status} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {reg.organization_name} · {reg.vendor_type || "vendor"} · {reg.contact_email}
                </p>
                {reg.requested_by && (
                  <p className="text-[11px] text-muted-foreground">
                    Submitted by {reg.requested_by.full_name || reg.requested_by.email}
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setApproveTarget(reg)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  onClick={() => setRejectTarget(reg)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Vendor List Section (extracted to respect Rules of Hooks) ─────────────────

function VendorListSection({
  canCreate,
  canManage,
  organizationId,
}: {
  canCreate: boolean;
  canManage: boolean;
  organizationId: string | null;
}) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Vendor | null>(null);

  const { vendors, total, isLoading, error } = useVendors();

  const searchLower = search.toLowerCase();
  const filteredVendors = search.trim()
    ? vendors.filter(
        (v) =>
          v.name?.toLowerCase().includes(searchLower) ||
          v.email?.toLowerCase().includes(searchLower) ||
          v.legal_name?.toLowerCase().includes(searchLower) ||
          v.code?.toLowerCase().includes(searchLower),
      )
    : vendors;

  const errorMessage = generalErrorMessage(error);

  return (
    <>
      <AnimatePresence>
        {showCreate && (
          <CreateVendorDialog
            open={showCreate}
            onClose={() => setShowCreate(false)}
            organizationId={organizationId}
          />
        )}
        {editTarget && (
          <EditVendorDialog vendor={editTarget} onClose={() => setEditTarget(null)} />
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search vendors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          {!isLoading && !error && (
            <p className="text-caption">
              {search.trim()
                ? `${filteredVendors.length} match${filteredVendors.length !== 1 ? "es" : ""}`
                : `${total} vendor${total !== 1 ? "s" : ""}`}
            </p>
          )}

          {(canCreate || canManage) && (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => setShowCreate(true)}
                disabled={!canCreate}
                title={!canCreate ? "Organization context required to create vendors." : undefined}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="w-4 h-4" /> Add Partner
              </button>
              {!canCreate && canManage && (
                <p className="text-[11px] text-muted-foreground">Organization context required.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <VendorCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredVendors.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {search.trim()
            ? `No vendors found matching "${search}".`
            : "No vendors registered yet."}
        </div>
      )}

      {/* Vendor cards */}
      {!isLoading && filteredVendors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVendors.map((v: Vendor, i: number) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <VendorCard
                vendor={v}
                expanded={expandedId === v.id}
                onToggle={() => setExpandedId(expandedId === v.id ? null : v.id)}
                canManage={canManage}
                onEdit={() => setEditTarget(v)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PartnersPage() {
  const { user } = useAuth();

  const canView = canViewVendor(user);
  const canCreate = canCreateVendor(user) && Boolean(user?.organization_id);
  const canManage = canManageVendor(user);

  // Access guard
  if (!canView) {
    return (
      <AppLayout title="Partners" subtitle="Vendor management & profiles">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldAlert className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-base font-semibold text-foreground mb-1">Access Denied</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            You do not have permission to view vendors. Contact your administrator to request <code className="text-xs bg-secondary px-1 rounded">vendor.view</code> access.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Partners" subtitle="Vendor management & profiles">
      {/* Registration review section — only shown to users with vendor.manage */}
      {canManage && (
        <div className="mb-6">
          <RegistrationReviewSection />
        </div>
      )}

      <VendorListSection
        canCreate={canCreate}
        canManage={canManage}
        organizationId={user?.organization_id ?? null}
      />
    </AppLayout>
  );
}
