import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { V2Shell } from "@/components/v2/V2Shell";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useOrganizations, useScopeNodes } from "@/lib/hooks/useScopeNodes";
import { useBudgets, useCategories, useSubCategories } from "@/lib/hooks/useV2Budget";
import {
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  submitExpense,
  settleExpense,
  cancelExpense,
  uploadExpenseAttachment,
  deleteExpenseAttachment,
} from "@/lib/api/manual-expenses";
import {
  EXPENSE_STATUS_LABELS,
  EXPENSE_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/types/manual-expenses";
import type {
  ManualExpenseEntry,
  ManualExpenseAttachment,
  ManualExpenseListItem,
  ExpenseStatus,
  PaymentMethod,
  CreateExpenseRequest,
} from "@/lib/types/manual-expenses";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Paperclip,
  Upload,
  Camera,
  X,
  FileText,
  Calendar,
  IndianRupee,
  Search,
  Filter,
} from "lucide-react";
import { format, parseISO } from "date-fns";

// ── Utility ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: string | number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

const UNSET_SELECT_VALUE = "__unset__";

function normalizeSelectId(value: string | number | null | undefined): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return String(value);
}

function formatDate(dateStr: string): string {
  try { return format(parseISO(dateStr), "dd MMM yyyy"); }
  catch { return dateStr; }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  try { return format(parseISO(dateStr), "dd MMM yyyy, hh:mm a"); }
  catch { return dateStr; }
}

function StatusBadge({ status }: { status: ExpenseStatus }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", EXPENSE_STATUS_COLORS[status])}>
      {EXPENSE_STATUS_LABELS[status]}
    </span>
  );
}

function PaymentBadge({ method }: { method: PaymentMethod }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
      {PAYMENT_METHOD_LABELS[method]}
    </span>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "settled", label: "Settled" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "petty_cash", label: "Petty Cash" },
  { value: "reimbursement", label: "Reimbursement" },
];

const ATTACHMENT_DOC_TYPES = [
  { value: "receipt", label: "Receipt" },
  { value: "invoice", label: "Invoice" },
  { value: "bill", label: "Bill" },
  { value: "supporting_document", label: "Supporting Document" },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ManualExpensesPage() {
  const [activeTab, setActiveTab] = useState<"all" | ExpenseStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedExpense, setSelectedExpense] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // List query
  const listParams = useMemo(() => ({
    status: activeTab === "all" ? undefined : activeTab,
    page: 1,
  }), [activeTab]);

  const {
    data: listData,
    isLoading: listLoading,
    error: listError,
  } = useQuery({
    queryKey: ["manual-expenses", "list", listParams],
    queryFn: () => listExpenses(listParams),
  });

  // Detail query (when expense selected)
  const {
    data: detailData,
    isLoading: detailLoading,
  } = useQuery({
    queryKey: ["manual-expenses", "detail", selectedExpense],
    queryFn: () => getExpense(selectedExpense!),
    enabled: !!selectedExpense,
  });

  const expenses = listData?.results ?? [];
  const filtered = useMemo(() => {
    if (!search) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(
      (e) =>
        e.vendor_name?.toLowerCase().includes(q) ||
        e.reference_number?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q),
    );
  }, [expenses, search]);

  // Mutations
  const submitMut = useMutation({
    mutationFn: submitExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-expenses"] });
      setSelectedExpense(null);
    },
  });

  const settleMut = useMutation({
    mutationFn: settleExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-expenses"] });
    },
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => cancelExpense(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-expenses"] });
      setSelectedExpense(null);
    },
  });

  return (
    <V2Shell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" />
              Manual Expenses
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track and manage offline expense entries
            </p>
          </div>
          <Button
            onClick={() => { setEditExpenseId(null); setIsCreateOpen(true); }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Expense
          </Button>
        </div>

        {/* Filters + content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Status tabs + search */}
          <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-b bg-muted/30">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <div className="overflow-x-auto pb-px">
              <TabsList>
                {STATUS_TABS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>
                    {t.label}
                    {t.value !== "all" && listData && (
                      <span className="ml-1.5 text-xs opacity-70">
                        {expenses.filter((e) => e.status === t.value).length}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              </div>
            </Tabs>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendor, reference, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Error state */}
          {listError && (
            <div className="flex items-center justify-center py-12 text-destructive">
              Failed to load expenses. Please try again.
            </div>
          )}

          {/* Table */}
          {!listError && (
            <div className="flex-1 overflow-auto">
              {listLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <IndianRupee className="h-12 w-12 mb-3 opacity-30" />
                  <p className="font-medium">No expenses found</p>
                  <p className="text-sm mt-1">
                    {activeTab === "all" ? "Create your first expense entry." : `No ${activeTab} expenses.`}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Vendor / Reference</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Budget / Category</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Payment</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">
                        <Paperclip className="h-4 w-4 inline" />
                      </th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((expense) => (
                      <ExpenseRow
                        key={expense.id}
                        expense={expense}
                        onView={() => setSelectedExpense(expense.id)}
                        onEdit={() => { setEditExpenseId(expense.id); setIsCreateOpen(true); }}
                      />
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedExpense && (
        <ExpenseDetailDrawer
          expense={detailData}
          loading={detailLoading}
          onClose={() => setSelectedExpense(null)}
          onSubmit={(id) => submitMut.mutate(id)}
          onSettle={(id) => settleMut.mutate(id)}
          onCancel={(id, note) => cancelMut.mutate({ id, note })}
          submitLoading={submitMut.isPending}
          settleLoading={settleMut.isPending}
          cancelLoading={cancelMut.isPending}
        />
      )}

      {/* Create / Edit Dialog */}
      {isCreateOpen && (
        <ExpenseFormDialog
          expenseId={editExpenseId}
          onClose={() => { setIsCreateOpen(false); setEditExpenseId(null); }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["manual-expenses"] });
            setIsCreateOpen(false);
            setEditExpenseId(null);
          }}
        />
      )}
    </V2Shell>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function ExpenseRow({
  expense,
  onView,
  onEdit,
}: {
  expense: ManualExpenseListItem;
  onView: () => void;
  onEdit: () => void;
}) {
  return (
    <tr className="border-b hover:bg-muted/40 transition-colors cursor-pointer" onClick={onView}>
      <td className="px-4 py-3">
        <div className="font-medium">{expense.vendor_name || "—"}</div>
        {expense.reference_number && (
          <div className="text-xs text-muted-foreground">{expense.reference_number}</div>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(expense.expense_date)}</td>
      <td className="px-4 py-3">
        <div className="text-sm">{expense.budget_name}</div>
        <div className="text-xs text-muted-foreground">{expense.category_name} › {expense.subcategory_name}</div>
      </td>
      <td className="px-4 py-3 text-right font-medium">
        {formatCurrency(expense.amount, expense.currency)}
      </td>
      <td className="px-4 py-3">
        <PaymentBadge method={expense.payment_method as PaymentMethod} />
      </td>
      <td className="px-4 py-3 text-center">
        <StatusBadge status={expense.status as ExpenseStatus} />
      </td>
      <td className="px-4 py-3 text-center text-muted-foreground">
        {expense.attachment_count > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs">
            <Paperclip className="h-3.5 w-3.5" />
            {expense.attachment_count}
          </span>
        ) : (
          <span className="text-xs opacity-40">0</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {expense.status === "draft" && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 px-2">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onView} className="h-7 px-2">
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

interface DetailDrawerProps {
  expense: ManualExpenseEntry | undefined;
  loading: boolean;
  onClose: () => void;
  onSubmit: (id: string) => void;
  onSettle: (id: string) => void;
  onCancel: (id: string, note?: string) => void;
  submitLoading: boolean;
  settleLoading: boolean;
  cancelLoading: boolean;
}

function ExpenseDetailDrawer({
  expense,
  loading,
  onClose,
  onSubmit,
  onSettle,
  onCancel,
  submitLoading,
  settleLoading,
  cancelLoading,
}: DetailDrawerProps) {
  const qc = useQueryClient();
  const [cancelNote, setCancelNote] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadTitles, setUploadTitles] = useState<Record<number, string>>({});
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const detailCameraInputId = `expense-detail-camera-${expense?.id ?? "loading"}`;

  function handleAttachmentFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setUploadingFiles((prev) => [...prev, ...files]);
    const newTitles: Record<number, string> = {};
    files.forEach((file, index) => {
      newTitles[uploadingFiles.length + index] = file.name;
    });
    setUploadTitles((prev) => ({ ...prev, ...newTitles }));
  }

  function removePendingAttachment(index: number) {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadTitles((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const numericKey = Number(key);
        if (numericKey < index) next[numericKey] = value;
        if (numericKey > index) next[numericKey - 1] = value;
      });
      return next;
    });
  }

  async function handleUploadAttachments() {
    if (!uploadingFiles.length) return;
    setAttachmentBusy(true);
    setAttachmentError(null);
    try {
      for (const [index, file] of uploadingFiles.entries()) {
        await uploadExpenseAttachment(
          expense.id,
          file,
          uploadTitles[index] || file.name,
          "supporting_document",
        );
      }
      await qc.invalidateQueries({ queryKey: ["manual-expenses", "detail", expense.id] });
      await qc.invalidateQueries({ queryKey: ["manual-expenses"] });
      setUploadingFiles([]);
      setUploadTitles({});
    } catch (e) {
      setAttachmentError(e instanceof ApiError ? e.message : "Failed to upload attachment.");
    } finally {
      setAttachmentBusy(false);
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    setAttachmentBusy(true);
    setAttachmentError(null);
    try {
      await deleteExpenseAttachment(attachmentId);
      await qc.invalidateQueries({ queryKey: ["manual-expenses", "detail", expense.id] });
      await qc.invalidateQueries({ queryKey: ["manual-expenses"] });
    } catch (e) {
      setAttachmentError(e instanceof ApiError ? e.message : "Failed to delete attachment.");
    } finally {
      setAttachmentBusy(false);
    }
  }

  if (!expense && loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-background border-l shadow-xl z-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!expense) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-background border-l shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Expense Details</h2>
            <p className="text-sm text-muted-foreground">{expense.vendor_name || "—"}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={expense.status as ExpenseStatus} />
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-6">
            {/* Core info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField label="Expense Date" value={formatDate(expense.expense_date)} icon={<Calendar className="h-4 w-4" />} />
              <InfoField label="Amount" value={formatCurrency(expense.amount, expense.currency)} highlight />
              <InfoField label="Reference" value={expense.reference_number || "—"} />
              <InfoField label="Payment Method" value={<PaymentBadge method={expense.payment_method as PaymentMethod} />} />
              <InfoField label="Budget" value={expense.budget_name} />
              <InfoField label="Category" value={expense.category_name} />
              <InfoField label="Subcategory" value={expense.subcategory_name} />
              {expense.vendor && (
                <InfoField label="Linked Vendor" value={expense.vendor_name} />
              )}
            </div>

            {expense.description && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                <p className="text-sm">{expense.description}</p>
              </div>
            )}

            {expense.source_note && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Source Note</h3>
                <p className="text-sm">{expense.source_note}</p>
              </div>
            )}

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">Attachments ({expense.attachment_count})</h3>
              </div>
              {expense.attachments?.length ? (
                <div className="space-y-2">
                  {expense.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <a
                        href={att.download_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{att.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {att.document_type} · {att.file_name}
                          </div>
                        </div>
                      </a>
                      {(expense.status === "draft" || expense.status === "submitted") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-destructive"
                          onClick={() => handleDeleteAttachment(att.id)}
                          disabled={attachmentBusy}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No attachments.</p>
              )}

              {(expense.status === "draft" || expense.status === "submitted") && (
                <div className="mt-4 space-y-3 rounded-lg border border-dashed p-4">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleAttachmentFileChange}
                    className="block w-full text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                  <div className="sm:hidden">
                    <input
                      id={detailCameraInputId}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleAttachmentFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor={detailCameraInputId}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground cursor-pointer hover:bg-muted"
                    >
                      <Camera className="h-4 w-4" />
                      Take Photo
                    </label>
                  </div>

                  {uploadingFiles.length > 0 && (
                    <div className="space-y-2">
                      {uploadingFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex items-center gap-3">
                          <span className="text-sm truncate flex-1">{file.name}</span>
                          <Input
                            placeholder="Title"
                            value={uploadTitles[index] || ""}
                            onChange={(e) => setUploadTitles((prev) => ({ ...prev, [index]: e.target.value }))}
                            className="w-40"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePendingAttachment(index)}
                            className="h-8 px-2 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleUploadAttachments}
                        disabled={attachmentBusy}
                        className="gap-1.5"
                      >
                        {attachmentBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload {uploadingFiles.length} file(s)
                      </Button>
                    </div>
                  )}

                  {attachmentError && (
                    <p className="text-sm text-destructive">{attachmentError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                <InfoField label="Created By" value={expense.created_by_name || "—"} />
                <InfoField label="Created At" value={formatDateTime(expense.created_at)} />
                {expense.submitted_at && <InfoField label="Submitted At" value={formatDateTime(expense.submitted_at)} />}
                {expense.settled_at && <InfoField label="Settled At" value={formatDateTime(expense.settled_at)} />}
                {expense.cancelled_at && <InfoField label="Cancelled At" value={formatDateTime(expense.cancelled_at)} />}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="px-6 py-4 border-t bg-muted/30 space-y-2">
          {expense.status === "draft" && (
            <Button
              onClick={() => onSubmit(expense.id)}
              disabled={submitLoading}
              className="w-full gap-2"
            >
              {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Expense
            </Button>
          )}
          {expense.status === "submitted" && (
            <Button
              onClick={() => onSettle(expense.id)}
              disabled={settleLoading}
              className="w-full gap-2"
            >
              {settleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Mark Settled
            </Button>
          )}
          {expense.status !== "settled" && (
            <>
              {!showCancelConfirm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full gap-2 text-destructive"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Expense
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Cancellation reason (optional)..."
                    value={cancelNote}
                    onChange={(e) => setCancelNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => { setShowCancelConfirm(false); setCancelNote(""); }}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => { onCancel(expense.id, cancelNote); setShowCancelConfirm(false); }}
                      disabled={cancelLoading}
                      className="flex-1 gap-2"
                    >
                      {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Confirm Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Form Dialog ───────────────────────────────────────────────────────────────

interface ExpenseFormProps {
  expenseId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function ExpenseFormDialog({ expenseId, onClose, onSaved }: ExpenseFormProps) {
  const qc = useQueryClient();

  // Pre-fetch existing expense for edit
  const { data: existing } = useQuery({
    queryKey: ["manual-expenses", "detail", expenseId],
    queryFn: () => getExpense(expenseId!),
    enabled: !!expenseId,
  });

  const [form, setForm] = useState<Partial<CreateExpenseRequest>>({
    payment_method: "petty_cash",
    currency: "INR",
  });
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadTitles, setUploadTitles] = useState<Record<number, string>>({});
  const dialogCameraInputId = `expense-form-camera-${expenseId ?? "new"}`;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: organizations = [] } = useOrganizations();
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const { data: scopeNodes = [] } = useScopeNodes(selectedOrgId || undefined);
  const { data: budgets = [] } = useBudgets({
    org: selectedOrgId || undefined,
    status: "active",
  });
  const { data: categories = [] } = useCategories({
    org: selectedOrgId || undefined,
    is_active: true,
  });
  const { data: subcategories = [] } = useSubCategories({
    category: form.category || undefined,
    is_active: true,
  });
  const selectedOrganization = useMemo(
    () => organizations.find((org) => String(org.id) === selectedOrgId),
    [organizations, selectedOrgId],
  );
  const selectedScopeNode = useMemo(
    () => scopeNodes.find((node) => String(node.id) === normalizeSelectId(form.scope_node)),
    [scopeNodes, form.scope_node],
  );
  const selectedBudget = useMemo(
    () => budgets.find((budget) => String(budget.id) === normalizeSelectId(form.budget)),
    [budgets, form.budget],
  );
  const selectedCategory = useMemo(
    () => categories.find((category) => String(category.id) === normalizeSelectId(form.category)),
    [categories, form.category],
  );
  const selectedSubcategory = useMemo(
    () => subcategories.find((subcategory) => String(subcategory.id) === normalizeSelectId(form.subcategory)),
    [subcategories, form.subcategory],
  );
  // Pre-fill for edit
  useEffect(() => {
    if (existing && !form.expense_date) {
      setForm({
        scope_node: normalizeSelectId(existing.scope_node),
        payment_method: existing.payment_method as PaymentMethod,
        vendor_name: existing.vendor_name || undefined,
        reference_number: existing.reference_number || undefined,
        expense_date: existing.expense_date,
        amount: existing.amount,
        currency: existing.currency,
        budget: normalizeSelectId(existing.budget),
        category: normalizeSelectId(existing.category),
        subcategory: normalizeSelectId(existing.subcategory),
        description: existing.description || undefined,
        source_note: existing.source_note || undefined,
      });
      if (existing.org) {
        setSelectedOrgId(String(existing.org));
      }
    }
  }, [existing, form.expense_date]);

  useEffect(() => {
    if (!expenseId && organizations.length === 1 && !selectedOrgId) {
      setSelectedOrgId(String(organizations[0].id));
    }
  }, [expenseId, organizations, selectedOrgId]);

  const createMut = useMutation({
    mutationFn: createExpense,
    onSuccess: onSaved,
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "Failed to create"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateExpenseRequest> }) =>
      updateExpense(id, data as CreateExpenseRequest),
    onSuccess: onSaved,
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "Failed to update"),
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.scope_node || !form.budget || !form.category || !form.subcategory || !form.expense_date || !form.amount) {
      setError("Scope, Budget, Category, Subcategory, Expense Date, and Amount are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (expenseId) {
        await updateMut.mutateAsync({ id: expenseId, data: form });
      } else {
        await createMut.mutateAsync(form as CreateExpenseRequest);
      }
      qc.invalidateQueries({ queryKey: ["manual-expenses"] });
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setUploadingFiles((prev) => [...prev, ...files]);
    const newTitles: Record<number, string> = {};
    files.forEach((f, i) => {
      newTitles[uploadingFiles.length + i] = f.name;
    });
    setUploadTitles((prev) => ({ ...prev, ...newTitles }));
  }

  function removeFile(index: number) {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUploadExisting() {
    if (!expenseId) return;
    for (const [idx, file] of uploadingFiles.entries()) {
      await uploadExpenseAttachment(
        expenseId,
        file,
        uploadTitles[idx] || file.name,
      );
    }
    qc.invalidateQueries({ queryKey: ["manual-expenses", "detail", expenseId] });
    setUploadingFiles([]);
    setUploadTitles({});
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{expenseId ? "Edit Expense" : "New Expense"}</DialogTitle>
          <DialogDescription>
            Enter the expense details, select the budget coding, and save the record for submission or settlement.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <form onSubmit={handleSave} className="space-y-4 px-1 py-2">
            {error && (
              <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3">{error}</div>
            )}

            {/* Row 1: Date + Amount + Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Expense Date *</Label>
                <Input
                  type="date"
                  value={form.expense_date || ""}
                  onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.amount || ""}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input
                  value={form.currency || "INR"}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  maxLength={10}
                />
              </div>
            </div>

            {/* Row 2: Organization + Scope + Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Organization *</Label>
                <Select
                  value={selectedOrgId || UNSET_SELECT_VALUE}
                  onValueChange={(value) => {
                    if (value === UNSET_SELECT_VALUE) return;
                    setSelectedOrgId(value);
                    setForm((f) => ({
                      ...f,
                      scope_node: undefined,
                      budget: undefined,
                      category: undefined,
                      subcategory: undefined,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <span className="block truncate">
                      {selectedOrganization?.name || "Select organization"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET_SELECT_VALUE} disabled>
                      Select organization
                    </SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Scope *</Label>
                <Select
                  value={form.scope_node || UNSET_SELECT_VALUE}
                  onValueChange={(value) => {
                    if (value === UNSET_SELECT_VALUE) return;
                    setForm((f) => ({
                      ...f,
                      scope_node: value,
                      budget: undefined,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <span className="block truncate">
                      {selectedScopeNode?.name || "Select scope node"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET_SELECT_VALUE} disabled>
                      Select scope node
                    </SelectItem>
                    {scopeNodes.map((node) => (
                      <SelectItem key={node.id} value={String(node.id)}>{node.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method *</Label>
                <Select
                  value={form.payment_method || "petty_cash"}
                  onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v as PaymentMethod }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Budget + Category + Subcategory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Budget *</Label>
                <Select
                  value={form.budget || UNSET_SELECT_VALUE}
                  onValueChange={(value) => {
                    if (value === UNSET_SELECT_VALUE) return;
                    setForm((f) => ({
                      ...f,
                      budget: value,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <span className="block truncate">
                      {selectedBudget ? `${selectedBudget.name} (${selectedBudget.code})` : "Select budget"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET_SELECT_VALUE} disabled>
                      Select budget
                    </SelectItem>
                    {budgets.map((budget) => (
                      <SelectItem key={budget.id} value={String(budget.id)}>
                        {budget.name} ({budget.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select
                  value={form.category || UNSET_SELECT_VALUE}
                  onValueChange={(value) => {
                    if (value === UNSET_SELECT_VALUE) return;
                    setForm((f) => ({
                      ...f,
                      category: value,
                      subcategory: undefined,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <span className="block truncate">
                      {selectedCategory?.name || "Select category"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET_SELECT_VALUE} disabled>
                      Select category
                    </SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subcategory *</Label>
                <Select
                  value={form.subcategory || UNSET_SELECT_VALUE}
                  onValueChange={(value) => {
                    if (value === UNSET_SELECT_VALUE) return;
                    setForm((f) => ({
                      ...f,
                      subcategory: value,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <span className="block truncate">
                      {selectedSubcategory?.name || "Select subcategory"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET_SELECT_VALUE} disabled>
                      Select subcategory
                    </SelectItem>
                    {subcategories.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={String(subcategory.id)}>{subcategory.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4: Vendor + Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Vendor Name</Label>
                <Input
                  placeholder="e.g. Amazon India"
                  value={form.vendor_name || ""}
                  onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reference Number</Label>
                <Input
                  placeholder="INV-001"
                  value={form.reference_number || ""}
                  onChange={(e) => setForm((f) => ({ ...f, reference_number: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 5: Description + Source Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of the expense..."
                  value={form.description || ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Source Note</Label>
                <Textarea
                  placeholder="Original source / notes..."
                  value={form.source_note || ""}
                  onChange={(e) => setForm((f) => ({ ...f, source_note: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>

            {/* File upload (visible on edit when expense exists) */}
            {expenseId && (
              <div className="space-y-2">
                <Label>Attachments</Label>
                <div className="border-2 border-dashed rounded-lg p-4 space-y-2">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileChange}
                    className="block w-full text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                  <div className="sm:hidden">
                    <input
                      id={dialogCameraInputId}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor={dialogCameraInputId}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground cursor-pointer hover:bg-muted"
                    >
                      <Camera className="h-4 w-4" />
                      Take Photo
                    </label>
                  </div>
                  {uploadingFiles.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {uploadingFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-sm truncate flex-1">{f.name}</span>
                          <Input
                            placeholder="Title"
                            value={uploadTitles[i] || ""}
                            onChange={(e) => setUploadTitles((prev) => ({ ...prev, [i]: e.target.value }))}
                            className="w-40"
                          />
                          <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <Button type="button" size="sm" variant="outline" onClick={handleUploadExisting} className="gap-1.5">
                        <Upload className="h-4 w-4" />
                        Upload {uploadingFiles.length} file(s)
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {expenseId ? "Save Changes" : "Create Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── InfoField helper ──────────────────────────────────────────────────────────

function InfoField({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className={cn("text-sm", highlight && "font-semibold text-primary")}>
        {value}
      </div>
    </div>
  );
}
