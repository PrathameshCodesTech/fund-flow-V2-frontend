import { useMemo, useState } from "react";
import { V2Shell } from "@/components/v2/V2Shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle2,
  FileClock,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { useVendors } from "@/lib/hooks/useV2Vendor";
import {
  useHistoricalInvoiceOptions,
  useInvoices,
  usePostHistoricalInvoice,
  usePreviewHistoricalInvoice,
  useReverseHistoricalInvoice,
} from "@/lib/hooks/useV2Invoice";
import type {
  HistoricalAllowedEntity,
  HistoricalInvoiceAllocationInput,
  HistoricalInvoicePreview,
  HistoricalInvoicePostRequest,
  Invoice,
} from "@/lib/types/v2invoice";
import type { Vendor } from "@/lib/types/v2vendor";

const NONE = "__none__";

type AllocationLine = {
  id: string;
  entityId: string;
  budgetId: string;
  categoryId: string;
  subcategoryId: string;
  campaignId: string;
  amount: string;
  note: string;
};

function formatCurrency(value: string | number | null | undefined): string {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function flattenEntities(options: HistoricalAllowedEntity[] | undefined): HistoricalAllowedEntity[] {
  const rows: HistoricalAllowedEntity[] = [];
  for (const entity of options ?? []) {
    rows.push(entity);
    rows.push(...flattenEntities(entity.child_entities));
  }
  return rows;
}

function newAllocationLine(): AllocationLine {
  return {
    id: crypto.randomUUID(),
    entityId: "",
    budgetId: "",
    categoryId: "",
    subcategoryId: NONE,
    campaignId: NONE,
    amount: "",
    note: "",
  };
}

function apiMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function buildPayload(params: {
  selectedVendor: Vendor | undefined;
  invoiceNumber: string;
  poNumber: string;
  financeReference: string;
  invoiceDate: string;
  amount: string;
  postingReason: string;
  allocations: AllocationLine[];
  document: File | null;
}): HistoricalInvoicePostRequest {
  if (!params.selectedVendor) {
    throw new Error("Select a vendor first.");
  }
  const allocations: HistoricalInvoiceAllocationInput[] = params.allocations.map((line) => ({
    entity: Number(line.entityId),
    budget: Number(line.budgetId),
    category: Number(line.categoryId),
    subcategory: line.subcategoryId && line.subcategoryId !== NONE ? Number(line.subcategoryId) : null,
    campaign: line.campaignId && line.campaignId !== NONE ? Number(line.campaignId) : null,
    amount: line.amount,
    note: line.note,
  }));
  return {
    vendor: Number(params.selectedVendor.id),
    invoice_number: params.invoiceNumber.trim(),
    po_number: params.poNumber.trim(),
    finance_reference_number: params.financeReference.trim(),
    invoice_date: params.invoiceDate,
    amount: params.amount,
    currency: "INR",
    posting_reason: params.postingReason.trim() || "Historical invoice posting",
    allocations,
    document: params.document,
  };
}

function PreviewPanel({ preview }: { preview: HistoricalInvoicePreview | null }) {
  if (!preview) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Validate the form to preview the exact budget deductions before posting.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold">Budget Impact Preview</p>
        <p className="text-xs text-muted-foreground">
          Total allocation {formatCurrency(preview.allocation_total)}
        </p>
      </div>
      <div className="divide-y divide-border">
        {preview.allocations.map((row) => (
          <div key={`${row.budget_line_id}-${row.amount}`} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-medium">{row.entity_name}</p>
              <p className="text-xs text-muted-foreground">
                {row.budget_name} | {row.category_name}
                {row.subcategory_name ? ` | ${row.subcategory_name}` : ""}
              </p>
            </div>
            <div className="text-sm md:text-right">
              <p className="font-semibold">{formatCurrency(row.amount)}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(row.available_before)} to {formatCurrency(row.available_after)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoricalInvoiceRow({
  invoice,
  onReverse,
}: {
  invoice: Invoice;
  onReverse: (invoice: Invoice) => void;
}) {
  const reversed = invoice.status === "historical_reversed";
  return (
    <div className="grid gap-3 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] md:items-center">
      <div>
        <p className="font-medium">{invoice.vendor_invoice_number || invoice.title}</p>
        <p className="text-xs text-muted-foreground">{invoice.vendor_name || "No vendor name"}</p>
      </div>
      <div className="text-sm">
        <p className="text-muted-foreground">Finance ref</p>
        <p>{invoice.finance_reference_number || "-"}</p>
      </div>
      <div className="text-sm">
        <p className="text-muted-foreground">Amount</p>
        <p className="font-medium">{formatCurrency(invoice.amount)}</p>
      </div>
      <div className="text-sm">
        <p className="text-muted-foreground">Posted</p>
        <p>{formatDate(invoice.historical_posted_at || invoice.created_at)}</p>
      </div>
      <div className="flex items-center gap-2 md:justify-end">
        <Badge variant={reversed ? "secondary" : "outline"}>
          {reversed ? "Reversed" : "Posted"}
        </Badge>
        {!reversed && (
          <Button variant="outline" size="sm" onClick={() => onReverse(invoice)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reverse
          </Button>
        )}
      </div>
    </div>
  );
}

export default function HistoricalInvoicesPage() {
  const [vendorSearch, setVendorSearch] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [financeReference, setFinanceReference] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [amount, setAmount] = useState("");
  const [postingReason, setPostingReason] = useState("Historical invoice posting");
  const [document, setDocument] = useState<File | null>(null);
  const [allocations, setAllocations] = useState<AllocationLine[]>([newAllocationLine()]);
  const [preview, setPreview] = useState<HistoricalInvoicePreview | null>(null);
  const [reverseTarget, setReverseTarget] = useState<Invoice | null>(null);
  const [reverseReason, setReverseReason] = useState("");

  const vendorsQuery = useVendors({ operational_status: "active", marketing_status: "approved" });
  const historicalInvoices = useInvoices({ entry_source: "historical_import" });
  const optionsQuery = useHistoricalInvoiceOptions(selectedVendorId || null);
  const previewMutation = usePreviewHistoricalInvoice();
  const postMutation = usePostHistoricalInvoice();
  const reverseMutation = useReverseHistoricalInvoice();

  const vendors = vendorsQuery.data ?? [];
  const filteredVendors = useMemo(() => {
    const q = vendorSearch.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((vendor) =>
      [vendor.vendor_name, vendor.email].some((value) => value?.toLowerCase().includes(q)),
    );
  }, [vendorSearch, vendors]);

  const selectedVendor = vendors.find((vendor) => String(vendor.id) === selectedVendorId);
  const entityOptions = useMemo(
    () => flattenEntities(optionsQuery.data?.allowed_entities),
    [optionsQuery.data],
  );
  const entityById = useMemo(() => {
    const map = new Map<string, HistoricalAllowedEntity>();
    for (const entity of entityOptions) {
      map.set(String(entity.entity_id), entity);
    }
    return map;
  }, [entityOptions]);

  const allocationTotal = useMemo(
    () => allocations.reduce((sum, line) => sum + Number(line.amount || 0), 0),
    [allocations],
  );
  const difference = Number(amount || 0) - allocationTotal;

  function updateLine(id: string, patch: Partial<AllocationLine>) {
    setPreview(null);
    setAllocations((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function resetForVendor(vendorId: string) {
    setSelectedVendorId(vendorId);
    setPreview(null);
    setAllocations([newAllocationLine()]);
  }

  async function handlePreview() {
    try {
      const payload = buildPayload({
        selectedVendor,
        invoiceNumber,
        poNumber,
        financeReference,
        invoiceDate,
        amount,
        postingReason,
        allocations,
        document: null,
      });
      const result = await previewMutation.mutateAsync(payload);
      setPreview(result);
      toast.success("Historical invoice validated.");
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }

  async function handlePost() {
    try {
      const payload = buildPayload({
        selectedVendor,
        invoiceNumber,
        poNumber,
        financeReference,
        invoiceDate,
        amount,
        postingReason,
        allocations,
        document,
      });
      await postMutation.mutateAsync(payload);
      toast.success("Historical invoice posted.");
      setInvoiceNumber("");
      setPoNumber("");
      setFinanceReference("");
      setInvoiceDate("");
      setAmount("");
      setPostingReason("Historical invoice posting");
      setDocument(null);
      setAllocations([newAllocationLine()]);
      setPreview(null);
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }

  async function handleReverse() {
    if (!reverseTarget) return;
    try {
      await reverseMutation.mutateAsync({
        id: reverseTarget.id,
        data: { reason: reverseReason },
      });
      toast.success("Historical invoice reversed.");
      setReverseTarget(null);
      setReverseReason("");
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }

  return (
    <V2Shell
      title="Historical Invoices"
      titleIcon={<FileClock className="h-5 w-5" />}
      breadcrumbs={[{ label: "Operations" }, { label: "Historical Invoices" }]}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-secondary/5">
        <div className="border-b border-border bg-background px-6 py-4">
          <h1 className="text-2xl font-semibold">Historical Invoice Posting</h1>
          <p className="text-sm text-muted-foreground">
            Post existing invoices directly to budget consumption with an audited reversal path.
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="grid gap-5 p-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
            <div className="space-y-5">
              <section className="rounded-lg border border-border bg-background">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="font-semibold">Invoice Details</h2>
                  <p className="text-sm text-muted-foreground">Vendor and invoice identifiers.</p>
                </div>
                <div className="grid gap-4 p-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label>Vendor *</Label>
                    <div className="mt-2 grid gap-2 md:grid-cols-[1fr_20rem]">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          value={vendorSearch}
                          onChange={(event) => setVendorSearch(event.target.value)}
                          placeholder="Search vendor name or email"
                        />
                      </div>
                      <Select value={selectedVendorId} onValueChange={resetForVendor}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select active vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredVendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={String(vendor.id)}>
                              {vendor.vendor_name} | {vendor.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedVendor && (
                      <div className="mt-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                        <span className="font-medium">{selectedVendor.vendor_name}</span>
                        <span className="text-muted-foreground"> | {selectedVendor.email}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Invoice Number *</Label>
                    <Input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} />
                  </div>
                  <div>
                    <Label>PO Number</Label>
                    <Input value={poNumber} onChange={(event) => setPoNumber(event.target.value)} />
                  </div>
                  <div>
                    <Label>Finance / SAP Reference *</Label>
                    <Input value={financeReference} onChange={(event) => setFinanceReference(event.target.value)} />
                  </div>
                  <div>
                    <Label>Invoice Date *</Label>
                    <Input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
                  </div>
                  <div>
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Invoice Document</Label>
                    <label className="mt-1 flex cursor-pointer items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
                      <span className="truncate text-muted-foreground">
                        {document ? document.name : "Optional PDF, Excel, or image"}
                      </span>
                      <Upload className="h-4 w-4" />
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg"
                        onChange={(event) => setDocument(event.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Posting Reason</Label>
                    <Textarea
                      value={postingReason}
                      onChange={(event) => setPostingReason(event.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-border bg-background">
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div>
                    <h2 className="font-semibold">Allocation Lines</h2>
                    <p className="text-sm text-muted-foreground">
                      Select the exact deduction point. Total must match invoice amount.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setAllocations((rows) => [...rows, newAllocationLine()])}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Line
                  </Button>
                </div>

                {optionsQuery.isLoading && selectedVendorId ? (
                  <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading budget options
                  </div>
                ) : null}

                <div className="space-y-4 p-5">
                  {allocations.map((line, index) => {
                    const entity = entityById.get(line.entityId);
                    const budgetLines = entity?.budget_lines.filter(
                      (budgetLine) =>
                        String(budgetLine.budget_id) === line.budgetId &&
                        String(budgetLine.category_id) === line.categoryId,
                    ) ?? [];
                    const subcategories = budgetLines
                      .filter((budgetLine) => budgetLine.subcategory_id)
                      .map((budgetLine) => ({
                        id: budgetLine.subcategory_id!,
                        name: budgetLine.subcategory_name!,
                        available: budgetLine.available_amount,
                      }));
                    const selectedLine = entity?.budget_lines.find(
                      (budgetLine) =>
                        String(budgetLine.budget_id) === line.budgetId &&
                        String(budgetLine.category_id) === line.categoryId &&
                        (line.subcategoryId === NONE
                          ? budgetLine.subcategory_id == null
                          : String(budgetLine.subcategory_id) === line.subcategoryId),
                    );

                    return (
                      <div key={line.id} className="rounded-lg border border-border p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-sm font-semibold">Line {index + 1}</p>
                          {allocations.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPreview(null);
                                setAllocations((rows) => rows.filter((row) => row.id !== line.id));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label>Region / Branch *</Label>
                            <Select
                              value={line.entityId}
                              onValueChange={(value) =>
                                updateLine(line.id, {
                                  entityId: value,
                                  budgetId: "",
                                  categoryId: "",
                                  subcategoryId: NONE,
                                  campaignId: NONE,
                                })
                              }
                            >
                              <SelectTrigger><SelectValue placeholder="Select scope" /></SelectTrigger>
                              <SelectContent>
                                {entityOptions.map((option) => (
                                  <SelectItem key={option.entity_id} value={String(option.entity_id)}>
                                    {option.parent_entity_name ? `${option.parent_entity_name} - ` : ""}
                                    {option.entity_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Funding Budget *</Label>
                            <Select
                              value={line.budgetId}
                              onValueChange={(value) =>
                                updateLine(line.id, {
                                  budgetId: value,
                                  categoryId: "",
                                  subcategoryId: NONE,
                                })
                              }
                              disabled={!entity}
                            >
                              <SelectTrigger><SelectValue placeholder="Select budget" /></SelectTrigger>
                              <SelectContent>
                                {entity?.budgets.map((budget) => (
                                  <SelectItem key={budget.id} value={String(budget.id)}>
                                    {budget.name} | Available {formatCurrency(budget.available_amount)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Category *</Label>
                            <Select
                              value={line.categoryId}
                              onValueChange={(value) =>
                                updateLine(line.id, {
                                  categoryId: value,
                                  subcategoryId: NONE,
                                })
                              }
                              disabled={!line.budgetId}
                            >
                              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                              <SelectContent>
                                {entity?.categories.map((category) => {
                                  const lineForCategory = entity.budget_lines.find(
                                    (budgetLine) =>
                                      String(budgetLine.budget_id) === line.budgetId &&
                                      budgetLine.category_id === category.id,
                                  );
                                  if (!lineForCategory) return null;
                                  return (
                                    <SelectItem key={category.id} value={String(category.id)}>
                                      {category.name} | Available {formatCurrency(lineForCategory.available_amount)}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Subcategory</Label>
                            <Select
                              value={line.subcategoryId}
                              onValueChange={(value) => updateLine(line.id, { subcategoryId: value })}
                              disabled={!line.categoryId}
                            >
                              <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE}>No subcategory</SelectItem>
                                {subcategories.map((subcategory) => (
                                  <SelectItem key={subcategory.id} value={String(subcategory.id)}>
                                    {subcategory.name} | Available {formatCurrency(subcategory.available)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Campaign</Label>
                            <Select
                              value={line.campaignId}
                              onValueChange={(value) => updateLine(line.id, { campaignId: value })}
                              disabled={!entity}
                            >
                              <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE}>No campaign</SelectItem>
                                {entity?.campaigns.map((campaign) => (
                                  <SelectItem key={campaign.id} value={String(campaign.id)}>
                                    {campaign.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Line Amount *</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.amount}
                              onChange={(event) => updateLine(line.id, { amount: event.target.value })}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Note</Label>
                            <Input value={line.note} onChange={(event) => updateLine(line.id, { note: event.target.value })} />
                          </div>
                        </div>
                        {selectedLine && (
                          <div className="mt-3 rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                            Selected line available: {formatCurrency(selectedLine.available_amount)}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="grid gap-2 text-sm md:grid-cols-3">
                      <div>
                        <p className="text-muted-foreground">Invoice Amount</p>
                        <p className="font-semibold">{formatCurrency(amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Allocated</p>
                        <p className="font-semibold">{formatCurrency(allocationTotal)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Balance</p>
                        <p className={difference === 0 ? "font-semibold text-emerald-600" : "font-semibold text-orange-600"}>
                          {formatCurrency(difference)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-lg border border-border bg-background p-5">
                <h2 className="font-semibold">Controls</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Preview must pass before posting. Posting skips workflow and consumes budget directly.
                </p>
                <div className="mt-4 space-y-2">
                  <Button className="w-full" variant="outline" onClick={handlePreview} disabled={previewMutation.isPending || !selectedVendor}>
                    {previewMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Validate and Preview
                  </Button>
                  <Button className="w-full" onClick={handlePost} disabled={postMutation.isPending || !preview}>
                    {postMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileClock className="mr-2 h-4 w-4" />}
                    Post Historical Invoice
                  </Button>
                </div>
              </section>

              <PreviewPanel preview={preview} />
            </aside>
          </div>

          <div className="px-6 pb-6">
            <section className="rounded-lg border border-border bg-background">
              <div className="border-b border-border px-5 py-4">
                <h2 className="font-semibold">Historical Invoice History</h2>
                <p className="text-sm text-muted-foreground">
                  Reversal is audited. Historical invoices are not edited or deleted.
                </p>
              </div>
              {historicalInvoices.isLoading ? (
                <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading history
                </div>
              ) : (historicalInvoices.data ?? []).length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No historical invoices posted yet.
                </div>
              ) : (
                <div>
                  {(historicalInvoices.data ?? []).map((invoice) => (
                    <HistoricalInvoiceRow key={invoice.id} invoice={invoice} onReverse={setReverseTarget} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </div>

      <Dialog open={!!reverseTarget} onOpenChange={(open) => !open && setReverseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse Historical Invoice</DialogTitle>
            <DialogDescription>
              This creates budget adjustment entries and keeps the original invoice history intact.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Reversal cannot be undone from this screen. Use this only for incorrect historical posting.
              </p>
            </div>
          </div>
          <Separator />
          <div>
            <Label>Reason *</Label>
            <Textarea
              value={reverseReason}
              onChange={(event) => setReverseReason(event.target.value)}
              placeholder="Explain why this historical posting is being reversed"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReverse}
              disabled={reverseMutation.isPending || reverseReason.trim().length < 3}
            >
              {reverseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Reverse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </V2Shell>
  );
}
