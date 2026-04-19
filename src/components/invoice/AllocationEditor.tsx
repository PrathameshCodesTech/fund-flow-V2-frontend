/**
 * AllocationEditor — manages invoice allocation lines.
 *
 * Uses GET /api/v1/invoices/<id>/allocations/ to load existing lines.
 * Uses PUT /api/v1/invoices/<id>/allocations/ (whole-list replacement) to save.
 *
 * Each line requires at least one dimension: org_unit, budget_node, cost_center, or campaign.
 * Currency is fixed to the invoice currency.
 * Total allocated must equal invoice total_amount before saving.
 */
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import {
  useInvoiceAllocations,
  useReplaceAllocations,
} from "@/lib/hooks/useInvoices";
import { useOrgUnitsAdmin } from "@/lib/hooks/useTenantAdmin";
import { useCampaigns } from "@/lib/hooks/useCampaigns";
import { useCostCenters } from "@/lib/hooks/useOrganizations";
import { useBudgetNodes } from "@/lib/hooks/useBudgets";
import type { InvoiceDetail } from "@/lib/types/invoices";

// ── Local draft shape ─────────────────────────────────────────────────────────

interface DraftLine {
  _key: string; // local-only stable key for React
  org_unit: string;
  cost_center: string;
  budget_node: string;
  campaign: string;
  allocated_amount: string;
  description: string;
}

function emptyLine(): DraftLine {
  return {
    _key: crypto.randomUUID(),
    org_unit: "",
    cost_center: "",
    budget_node: "",
    campaign: "",
    allocated_amount: "",
    description: "",
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  invoice: InvoiceDetail;
  /** Whether user has invoice.manage capability (controls edit vs read-only mode). */
  canManage: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AllocationEditor({ invoice, canManage }: Props) {
  const invoiceTotal = Number(invoice.total_amount);
  const invoiceCurrency = invoice.currency;

  // ── Server data ──────────────────────────────────────────────────────────
  const {
    data: serverAllocations,
    isLoading: allocationsLoading,
    error: allocationsError,
  } = useInvoiceAllocations(invoice.id);

  const { replaceAllocations, isReplacing, replaceError } =
    useReplaceAllocations(invoice.id);

  // ── Lookup data ──────────────────────────────────────────────────────────
  const { data: orgUnits = [], isLoading: orgUnitsLoading } = useOrgUnitsAdmin(
    invoice.organization.id,
  );
  const { campaigns, isLoading: campaignsLoading } = useCampaigns({
    organization: invoice.organization.id,
  });
  const { data: costCenters = [], isLoading: costCentersLoading } = useCostCenters(
    invoice.organization.id,
  );
  const { data: budgetNodes = [], isLoading: budgetNodesLoading } = useBudgetNodes({
    organization: invoice.organization.id,
  });

  // ── Draft state ──────────────────────────────────────────────────────────
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [dirty, setDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialise lines from server data
  useEffect(() => {
    if (!serverAllocations) return;
    if (serverAllocations.length === 0) {
      setLines([emptyLine()]);
    } else {
      setLines(
        serverAllocations.map((alloc) => ({
          _key: alloc.id,
          org_unit: alloc.org_unit ?? "",
          cost_center: alloc.cost_center ?? "",
          budget_node: alloc.budget_node ?? "",
          campaign: alloc.campaign ?? "",
          allocated_amount: alloc.allocated_amount,
          description: alloc.description ?? "",
        })),
      );
    }
    setDirty(false);
  }, [serverAllocations]);

  // ── Derived totals ───────────────────────────────────────────────────────
  const allocatedTotal = lines.reduce((sum, l) => {
    const v = Number(l.allocated_amount);
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);
  const difference = invoiceTotal - allocatedTotal;
  const isBalanced = Math.abs(difference) < 0.005;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const updateLine = (key: string, field: keyof DraftLine, value: string) => {
    setLines((prev) =>
      prev.map((l) => (l._key === key ? { ...l, [field]: value } : l)),
    );
    setFieldErrors((prev) => ({ ...prev, [`${key}_${field}`]: "" }));
    setDirty(true);
    setSaveSuccess(false);
    setGeneralError(null);
  };

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()]);
    setDirty(true);
    setSaveSuccess(false);
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l._key !== key));
    setDirty(true);
    setSaveSuccess(false);
  };

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    lines.forEach((line) => {
      const hasDimension = line.org_unit || line.budget_node || line.cost_center || line.campaign;
      if (!hasDimension) {
        errs[`${line._key}_org_unit`] =
          "At least one dimension (Org Unit, Budget Node, Cost Center, or Campaign) is required.";
      }
      const amount = Number(line.allocated_amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        errs[`${line._key}_allocated_amount`] = "Enter a valid positive amount.";
      }
    });

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setGeneralError(null);
    if (!validate()) return;

    if (!isBalanced) {
      setGeneralError(
        `Allocated total (${allocatedTotal.toFixed(2)}) must equal invoice total (${invoiceTotal.toFixed(2)} ${invoiceCurrency}). Adjust amounts before saving.`,
      );
      return;
    }

    try {
      await replaceAllocations(
        lines.map((l) => ({
          org_unit: l.org_unit || null,
          cost_center: l.cost_center || null,
          budget_node: l.budget_node || null,
          campaign: l.campaign || null,
          allocated_amount: Number(l.allocated_amount).toFixed(2),
          currency: invoiceCurrency,
          description: l.description,
        })),
      );
      setDirty(false);
      setSaveSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setGeneralError(
          err.errors.detail?.[0] ??
            err.errors.non_field_errors?.[0] ??
            err.message,
        );
        return;
      }
      setGeneralError(getErrorMessage(err, "Failed to save allocations."));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (allocationsLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading allocations…
      </div>
    );
  }

  if (allocationsError) {
    const msg = getErrorMessage(allocationsError, "Failed to load allocations.");
    // Backend may return 403 if user lacks manage permission
    if ((allocationsError as ApiError)?.status === 403) {
      return (
        <p className="text-sm text-muted-foreground">
          Allocation details are not visible to your current role.
        </p>
      );
    }
    return (
      <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        {msg}
      </div>
    );
  }

  // Read-only view when user cannot manage
  if (!canManage) {
    if (!serverAllocations || serverAllocations.length === 0) {
      return <p className="text-sm text-muted-foreground">No allocation lines.</p>;
    }
    return (
      <div className="space-y-2">
        {serverAllocations.map((alloc) => (
          <div
            key={alloc.id}
            className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-3"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                Line {alloc.line_number}
              </p>
              <p className="text-caption">
                {alloc.campaign_summary?.name ||
                  alloc.budget_node_summary?.name ||
                  alloc.cost_center_summary?.name ||
                  alloc.org_unit_summary?.name ||
                  "—"}
              </p>
              {alloc.description && (
                <p className="text-caption">{alloc.description}</p>
              )}
            </div>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {Number(alloc.allocated_amount).toLocaleString("en-IN", {
                style: "currency",
                currency: alloc.currency,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Editable view
  const lookupsLoading = orgUnitsLoading || campaignsLoading || costCentersLoading || budgetNodesLoading;

  return (
    <div className="space-y-4">
      {/* Running total banner */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm font-medium ${
          isBalanced
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}
      >
        <span>
          Allocated:{" "}
          <span className="font-semibold tabular-nums">
            {allocatedTotal.toFixed(2)} {invoiceCurrency}
          </span>
        </span>
        <span>
          Invoice Total:{" "}
          <span className="font-semibold tabular-nums">
            {invoiceTotal.toFixed(2)} {invoiceCurrency}
          </span>
        </span>
        <span>
          {isBalanced ? (
            "Balanced"
          ) : (
            <>
              Remaining:{" "}
              <span className="font-semibold tabular-nums">
                {difference.toFixed(2)} {invoiceCurrency}
              </span>
            </>
          )}
        </span>
      </div>

      {lookupsLoading && (
        <p className="text-xs text-muted-foreground">Loading lookup data…</p>
      )}

      {/* Lines */}
      <div className="space-y-3">
        {lines.map((line, idx) => (
          <div
            key={line._key}
            className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Line {idx + 1}
              </span>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(line._key)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove line"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              {/* Org Unit */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Org Unit
                </label>
                <select
                  value={line.org_unit}
                  onChange={(e) => updateLine(line._key, "org_unit", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— None —</option>
                  {orgUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
                {fieldErrors[`${line._key}_org_unit`] && (
                  <p className="mt-1 text-[11px] text-destructive">
                    {fieldErrors[`${line._key}_org_unit`]}
                  </p>
                )}
              </div>

              {/* Cost Center */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Cost Center
                </label>
                <select
                  value={line.cost_center}
                  onChange={(e) => updateLine(line._key, "cost_center", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— None —</option>
                  {costCenters.length === 0 && !costCentersLoading && (
                    <option disabled>No cost centers available</option>
                  )}
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.name} ({cc.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Budget Node */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Budget Node
                </label>
                <select
                  value={line.budget_node}
                  onChange={(e) => updateLine(line._key, "budget_node", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— None —</option>
                  {budgetNodes.length === 0 && !budgetNodesLoading && (
                    <option disabled>No budget nodes available</option>
                  )}
                  {budgetNodes.map((bn) => (
                    <option key={bn.id} value={bn.id}>
                      {bn.name} ({bn.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Campaign */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Campaign
                </label>
                <select
                  value={line.campaign}
                  onChange={(e) => updateLine(line._key, "campaign", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— None —</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="sm:col-span-1">
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Allocated Amount ({invoiceCurrency}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.allocated_amount}
                  onChange={(e) =>
                    updateLine(line._key, "allocated_amount", e.target.value)
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {fieldErrors[`${line._key}_allocated_amount`] && (
                  <p className="mt-1 text-[11px] text-destructive">
                    {fieldErrors[`${line._key}_allocated_amount`]}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="sm:col-span-3">
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Description
                </label>
                <input
                  type="text"
                  value={line.description}
                  onChange={(e) =>
                    updateLine(line._key, "description", e.target.value)
                  }
                  placeholder="Optional notes for this line"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add line */}
      <button
        type="button"
        onClick={addLine}
        className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        Add Line
      </button>

      {/* Errors */}
      {(generalError || replaceError) && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {generalError ?? getErrorMessage(replaceError, "Failed to save allocations.")}
        </div>
      )}

      {saveSuccess && !dirty && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          Allocations saved successfully.
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isReplacing || !dirty}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isReplacing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save Allocations"
          )}
        </button>
      </div>
    </div>
  );
}
