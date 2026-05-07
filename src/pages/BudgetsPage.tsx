import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { V2Shell } from "@/components/v2/V2Shell";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  useOrganizations,
  useScopeNodes,
} from "@/lib/hooks/useScopeNodes";
import type { ScopeNode } from "@/lib/types/core";
import {
  useCategories,
  useSubCategories,
  useBudgets,
  useRules,
  useConsumptions,
  useVarianceRequests,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateSubCategory,
  useUpdateSubCategory,
  useDeleteSubCategory,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
  useCreateRule,
  useUpdateRule,
  useDeleteRule,
  useReviewVarianceRequest,
  useBudgetOverview,
  useBudgetImportBatches,
  useBudgetImportBatch,
  useUploadBudgetImportBatch,
  useValidateBudgetImportBatch,
  useCommitBudgetImportBatch,
} from "@/lib/hooks/useV2Budget";
import type {
  BudgetCategory,
  BudgetSubCategory,
  Budget,
  BudgetLine,
  BudgetRule,
  BudgetConsumption,
  BudgetVarianceRequest,
  BudgetImportBatchList,
  BudgetImportBatch,
  BudgetImportRow,
  ImportMode,
  ImportBatchStatus,
  ImportRowStatus,
  BudgetStatus,
  PeriodType,
  VarianceStatus,
  ConsumptionType,
  SourceType,
  CreateCategoryRequest,
  CreateSubCategoryRequest,
  CreateBudgetRequest,
  CreateBudgetLineRequest,
  CreateRuleRequest,
  BudgetCategoryOverview,
} from "@/lib/types/v2budget";
import {
  BUDGET_STATUS_LABELS,
  PERIOD_TYPE_LABELS,
  VARIANCE_STATUS_LABELS,
  CONSUMPTION_TYPE_LABELS,
  CONSUMPTION_STATUS_LABELS,
  SOURCE_TYPE_LABELS,
  IMPORT_MODE_LABELS,
  IMPORT_MODE_DESCRIPTIONS,
  IMPORT_BATCH_STATUS_LABELS,
  IMPORT_ROW_STATUS_LABELS,
} from "@/lib/types/v2budget";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Wallet,
  FolderOpen,
  Folder,
  GitBranch,
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCcw,
  LayoutDashboard,
  List,
  BarChart3,
  ChevronDown,
  ChevronRight,
  MapPin,
  TrendingUp,
  DollarSign,
  Target,
  Bookmark,
  Upload,
  FileSpreadsheet,
  ShieldCheck,
  Send,
  Info,
  RotateCcw,
} from "lucide-react";

// ── Status Badges ─────────────────────────────────────────────────────────────

const BUDGET_STATUS_COLORS: Record<BudgetStatus, string> = {
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  exhausted: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  frozen: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

function normalizeBudgetSelectId(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function BudgetStatusBadge({ status }: { status: BudgetStatus }) {
  return (
    <Badge className={BUDGET_STATUS_COLORS[status] ?? ""} variant="outline">
      {BUDGET_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function VarianceStatusBadge({ status }: { status: VarianceStatus }) {
  const colors: Record<VarianceStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };
  return (
    <Badge className={colors[status] ?? ""} variant="outline">
      {VARIANCE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function ConsumptionTypeBadge({ ct }: { ct: ConsumptionType }) {
  const colors: Record<ConsumptionType, string> = {
    reserved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    consumed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    released: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    adjusted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };
  return (
    <Badge className={colors[ct] ?? ""} variant="outline">
      {CONSUMPTION_TYPE_LABELS[ct] ?? ct}
    </Badge>
  );
}

// ── Loading / Empty helpers ────────────────────────────────────────────────────

function PageLoading() {
  return (
    <div className="flex h-32 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyState({ message, icon: Icon }: { message: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
      <Icon className="mb-2 h-8 w-8 opacity-30" />
      <p>{message}</p>
    </div>
  );
}

// ── Form Field Error ──────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

// ── Create Category Dialog ──────────────────────────────────────────────────────

function CreateCategoryDialog({
  orgId,
  onSuccess,
}: {
  orgId: string | null;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateCategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoryRequest & { org_id: string }>();

  const onSubmit = async (data: Record<string, string>) => {
    try {
      await create.mutateAsync({ org: data.org_id, name: data.name, code: data.code });
      setOpen(false);
      reset();
      onSuccess?.();
    } catch { /* error via create.error */ }
  };

  const submitError =
    create.isError && create.error instanceof ApiError
      ? create.error.message
      : create.isError
      ? "Failed to create category"
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5" disabled={!orgId}>
          <Plus className="h-4 w-4" />
          New Category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Category</DialogTitle>
        </DialogHeader>
        <form id="create-cat-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("org_id")} value={orgId ?? ""} />
          <p className="text-xs text-muted-foreground py-1">
            Creating under org: <strong>{orgId ?? "none selected"}</strong>
          </p>
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              {...register("name", { required: "Required" })}
              placeholder="e.g. Marketing"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <FieldError message={errors.name.message} />}
          </div>
          <div className="space-y-1.5">
            <Label>Code *</Label>
            <Input
              {...register("code", { required: "Required" })}
              placeholder="e.g. MKT"
              className={errors.code ? "border-destructive" : ""}
            />
            {errors.code && <FieldError message={errors.code.message} />}
          </div>
          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            type="submit"
            form="create-cat-form"
            disabled={isSubmitting || create.isPending}
          >
            {create.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Creating...</> : "Create Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Category Dialog ──────────────────────────────────────────────────────

function EditCategoryDialog({
  category,
  onSuccess,
}: {
  category: BudgetCategory;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const update = useUpdateCategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string; code: string; is_active: boolean }>({
    defaultValues: {
      name: category.name,
      code: category.code,
      is_active: category.is_active,
    },
  });

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      await update.mutateAsync({ id: category.id, data: data as { name?: string; code?: string; is_active?: boolean } });
      setOpen(false);
      onSuccess?.();
    } catch { /* error via update.error */ }
  };

  const submitError =
    update.isError && update.error instanceof ApiError
      ? update.error.message
      : update.isError
      ? "Failed to update category"
      : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
        </DialogHeader>
        <form id="edit-cat-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input {...register("name", { required: "Required" })} className={errors.name ? "border-destructive" : ""} />
            {errors.name && <FieldError message={errors.name.message} />}
          </div>
          <div className="space-y-1.5">
            <Label>Code *</Label>
            <Input {...register("code", { required: "Required" })} className={errors.code ? "border-destructive" : ""} />
            {errors.code && <FieldError message={errors.code.message} />}
          </div>
          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            type="submit"
            form="edit-cat-form"
            disabled={isSubmitting || update.isPending}
          >
            {update.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Category Dialog ────────────────────────────────────────────────────

function DeleteCategoryDialog({
  category,
  onSuccess,
}: {
  category: BudgetCategory;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const del = useDeleteCategory();

  const handleDelete = async () => {
    try {
      await del.mutateAsync(category.id);
      setOpen(false);
      onSuccess?.();
    } catch { /* error via del.error */ }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Category</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{category.name}</strong>? This may fail if the category has associated subcategories or budgets.
        </p>
        {del.isError && del.error instanceof ApiError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {del.error.message}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
            {del.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create SubCategory Dialog ──────────────────────────────────────────────────

function CreateSubCategoryDialog({
  categoryId,
  onSuccess,
}: {
  categoryId: string | null;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateSubCategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSubCategoryRequest & { category_id: string }>();

  const onSubmit = async (data: Record<string, string>) => {
    try {
      await create.mutateAsync({ category: data.category_id, name: data.name, code: data.code });
      setOpen(false);
      reset();
      onSuccess?.();
    } catch { /* error via create.error */ }
  };

  const submitError =
    create.isError && create.error instanceof ApiError
      ? create.error.message
      : create.isError
      ? "Failed to create subcategory"
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5" disabled={!categoryId}>
          <Plus className="h-4 w-4" />
          New Subcategory
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Subcategory</DialogTitle>
        </DialogHeader>
        <form id="create-subcat-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("category_id")} value={categoryId ?? ""} />
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input {...register("name", { required: "Required" })} placeholder="e.g. Digital Ads" className={errors.name ? "border-destructive" : ""} />
            {errors.name && <FieldError message={errors.name.message} />}
          </div>
          <div className="space-y-1.5">
            <Label>Code *</Label>
            <Input {...register("code", { required: "Required" })} placeholder="e.g. DIG" className={errors.code ? "border-destructive" : ""} />
            {errors.code && <FieldError message={errors.code.message} />}
          </div>
          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="create-subcat-form" disabled={isSubmitting || create.isPending}>
            {create.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Creating...</> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit SubCategory Dialog ───────────────────────────────────────────────────

function EditSubCategoryDialog({
  subcategory,
  onSuccess,
}: {
  subcategory: BudgetSubCategory;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const update = useUpdateSubCategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string; code: string }>({
    defaultValues: { name: subcategory.name, code: subcategory.code },
  });

  const onSubmit = async (data: Record<string, string>) => {
    try {
      await update.mutateAsync({ id: subcategory.id, data });
      setOpen(false);
      onSuccess?.();
    } catch { /* error via update.error */ }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Subcategory</DialogTitle>
        </DialogHeader>
        <form id="edit-subcat-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input {...register("name", { required: "Required" })} className={errors.name ? "border-destructive" : ""} />
            {errors.name && <FieldError message={errors.name.message} />}
          </div>
          <div className="space-y-1.5">
            <Label>Code *</Label>
            <Input {...register("code", { required: "Required" })} className={errors.code ? "border-destructive" : ""} />
            {errors.code && <FieldError message={errors.code.message} />}
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="edit-subcat-form" disabled={isSubmitting || update.isPending}>
            {update.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete SubCategory Dialog ─────────────────────────────────────────────────

function DeleteSubCategoryDialog({
  subcategory,
  onSuccess,
}: {
  subcategory: BudgetSubCategory;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const del = useDeleteSubCategory();

  const handleDelete = async () => {
    try {
      await del.mutateAsync(subcategory.id);
      setOpen(false);
      onSuccess?.();
    } catch { /* error via del.error */ }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Subcategory</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{subcategory.name}</strong>?
        </p>
        {del.isError && del.error instanceof ApiError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {del.error.message}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
            {del.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Budget Dialog ──────────────────────────────────────────────────────

function CreateBudgetDialog({
  orgId,
  scopeNodeId,
  onSuccess,
}: {
  orgId: string | null;
  scopeNodeId: string | null;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateBudget();

  const { data: categories = [] } = useCategories(orgId ? { org: orgId } : undefined);
  const { data: subcategories = [] } = useSubCategories();
  const { data: nodes = [] } = useScopeNodes(orgId ?? undefined);

  // Dynamic line builder state
  const [lines, setLines] = useState<CreateBudgetLineRequest[]>([
    { category: "", subcategory: null, allocated_amount: "" },
  ]);
  const [selectedScopeNodeId, setSelectedScopeNodeId] = useState<string>(scopeNodeId ?? "");
  const [financialYear, setFinancialYear] = useState("2026-27");
  const [periodType, setPeriodType] = useState<PeriodType>("yearly");
  const [currency, setCurrency] = useState("INR");

  const linesTotal = lines.reduce(
    (sum, l) => sum + (parseFloat(l.allocated_amount) || 0),
    0,
  );

  const addLine = () => {
    setLines((prev) => [...prev, { category: "", subcategory: null, allocated_amount: "" }]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof CreateBudgetLineRequest, value: string) => {
    setLines((prev) =>
      prev.map((line, i) =>
        i === index ? { ...line, [field]: value } : line,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scopeNodeId) return;
    if (lines.length === 0) return;
    if (lines.some((l) => !l.category || !l.allocated_amount)) return;

    try {
      await create.mutateAsync({
        scope_node: selectedScopeNodeId,
        name: `FY${financialYear.replace("-", "")} Budget`,
        code: `FY${financialYear.replace("-", "")}-${scopeNodeId.slice(-4).toUpperCase()}`,
        financial_year: financialYear,
        period_type: periodType,
        allocated_amount: String(linesTotal),
        currency,
        status: "draft",
        lines,
      });
      setOpen(false);
      setLines([{ category: "", subcategory: null, allocated_amount: "" }]);
      setSelectedScopeNodeId("");
      setFinancialYear("2026-27");
      setCurrency("INR");
      onSuccess?.();
    } catch { /* error via create.error */ }
  };

  const submitError =
    create.isError && create.error instanceof ApiError
      ? create.error.message
      : create.isError
      ? "Failed to create budget"
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Budget
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Create Budget</DialogTitle>
        </DialogHeader>
        <form id="create-budget-form" onSubmit={handleSubmit} className="space-y-5">
          {/* Header fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Scope Node *</Label>
              <Select value={selectedScopeNodeId} onValueChange={setSelectedScopeNodeId}>
                <SelectTrigger><SelectValue placeholder="Select scope node..." /></SelectTrigger>
                <SelectContent>
                  {nodes.map((n) => (
                    <SelectItem key={n.id} value={n.id}>{n.name} ({n.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Financial Year *</Label>
              <Input
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                placeholder="e.g. 2026-27"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Period Type</Label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["yearly", "quarterly", "monthly", "campaign"] as PeriodType[]).map((pt) => (
                    <SelectItem key={pt} value={pt}>{PERIOD_TYPE_LABELS[pt]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="INR" />
            </div>
          </div>

          {/* Line builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Budget Lines</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
              </Button>
            </div>

            {lines.map((line, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Category *</Label>
                  <Select
                    value={normalizeBudgetSelectId(line.category)}
                    onValueChange={(v) => updateLine(index, "category", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={normalizeBudgetSelectId(c.id)}>{c.name} ({c.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Subcategory</Label>
                  <Select
                    value={normalizeBudgetSelectId(line.subcategory)}
                    onValueChange={(v) => updateLine(index, "subcategory", v || null)}
                    disabled={!line.category}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional..." />
                    </SelectTrigger>
                    <SelectContent>
                      {line.category && subcategories
                        .filter((sc) => sc.category === line.category)
                        .map((sc) => (
                          <SelectItem key={sc.id} value={normalizeBudgetSelectId(sc.id)}>{sc.name} ({sc.code})</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-36 space-y-1">
                  <Label className="text-xs">Amount *</Label>
                  <Input
                    value={line.allocated_amount}
                    onChange={(e) => updateLine(index, "allocated_amount", e.target.value)}
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLine(index)}
                  disabled={lines.length === 1}
                  className="shrink-0 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="flex justify-end pt-1">
              <p className="text-sm">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-medium">{currency} {linesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
            </div>
          </div>

          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            type="submit"
            form="create-budget-form"
            disabled={create.isPending || !selectedScopeNodeId || lines.length === 0}
          >
            {create.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Creating...</> : "Create Budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Budget Dialog ────────────────────────────────────────────────────────

function EditBudgetDialog({
  budget,
  onSuccess,
}: {
  budget: Budget;
  onSuccess?: () => void;
}) {
  type EditableBudgetLine = BudgetLine & { _deleted?: boolean; _isNew?: boolean };

  const [open, setOpen] = useState(false);
  const update = useUpdateBudget();

  const { data: categories = [] } = useCategories(budget.org ? { org: budget.org } : undefined);
  const { data: subcategories = [] } = useSubCategories();

  const [name, setName] = useState(budget.name);
  const [code, setCode] = useState(budget.code);
  const [currency, setCurrency] = useState(budget.currency || "INR");
  const [lines, setLines] = useState<EditableBudgetLine[]>([]);
  const [clientError, setClientError] = useState<string | null>(null);

  const resetForm = () => {
    setName(budget.name);
    setCode(budget.code);
    setCurrency(budget.currency || "INR");
    setClientError(null);
    setLines(
      (budget.lines || []).map((line) => ({
        ...line,
        category: normalizeBudgetSelectId(line.category),
        subcategory: line.subcategory ? normalizeBudgetSelectId(line.subcategory) : null,
        _deleted: false,
        _isNew: false,
      })),
    );
  };

  const isLineLocked = (line: BudgetLine) => {
    const allocated = parseFloat(line.allocated_amount || "0") || 0;
    const reserved = parseFloat(line.reserved_amount || "0") || 0;
    const consumed = parseFloat(line.consumed_amount || "0") || 0;
    return allocated > 0 && reserved + consumed >= allocated;
  };

  const getLineMinimumAmount = (line: BudgetLine) => {
    const reserved = parseFloat(line.reserved_amount || "0") || 0;
    const consumed = parseFloat(line.consumed_amount || "0") || 0;
    return reserved + consumed;
  };

  const activeLines = lines.filter((line) => !line._deleted);
  const linesTotal = activeLines
    .reduce((sum, l) => sum + (parseFloat(l.allocated_amount) || 0), 0);
  const originalTotal = parseFloat(budget.allocated_amount || "0") || 0;
  const totalDelta = linesTotal - originalTotal;
  const activeLineCount = activeLines.length;
  const lockedLineCount = activeLines.filter((line) => isLineLocked(line)).length;
  const increasedBy = totalDelta > 0 ? totalDelta : 0;
  const decreasedBy = totalDelta < 0 ? Math.abs(totalDelta) : 0;

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        budget: budget.id,
        category: "",
        subcategory: null,
        allocated_amount: "",
        reserved_amount: "0",
        consumed_amount: "0",
        available_amount: "0",
        utilization_percent: 0,
        category_name: "",
        subcategory_name: "",
        created_at: "",
        updated_at: "",
        _deleted: false,
        _isNew: true,
      },
    ]);
  };

  const removeLine = (lineId: string) => {
    setLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, _deleted: true } : line))
    );
  };

  const updateLine = (lineId: string, patch: Partial<EditableBudgetLine>) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;

        const next = { ...line, ...patch };

        if ("category" in patch) {
          const nextCategory = patch.category ?? "";
          if (!nextCategory) {
            next.subcategory = null;
          } else if (
            next.subcategory &&
            !subcategories.some(
              (subcategory) =>
                normalizeBudgetSelectId(subcategory.id) === next.subcategory &&
                normalizeBudgetSelectId(subcategory.category) === nextCategory,
            )
          ) {
            next.subcategory = null;
          }
        }

        return next;
      }),
    );
  };

  // Populate lines from budget when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o) {
      resetForm();
    }
    setOpen(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    const originalLineMap = new Map(
      (budget.lines || []).map((line) => [String(line.id), line]),
    );

    for (const line of activeLines) {
      const parsedAmount = parseFloat(line.allocated_amount || "0");
      const originalLine = originalLineMap.get(String(line.id));
      const originalAmount = originalLine ? parseFloat(originalLine.allocated_amount || "0") : null;
      const amountChanged = originalAmount === null || parsedAmount !== originalAmount;
      if (!line.category || !line.allocated_amount) {
        setClientError("Every active budget line must have a category and amount before saving.");
        return;
      }
      if ((!Number.isFinite(parsedAmount) || parsedAmount < 0.01) && amountChanged) {
        setClientError("Budget line amount must be greater than 0.01.");
        return;
      }
      const minAmount = getLineMinimumAmount(line);
      if (isLineLocked(line) && amountChanged && parsedAmount < minAmount) {
        setClientError(
          `Line ${line.category_name || line.category}: amount cannot be reduced below ${currency} ${minAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} because that much is already reserved or consumed.`,
        );
        return;
      }
    }

    const payload_lines = activeLines
      .filter((line) => line.category && line.allocated_amount)
      .map((l) => {
        if (String(l.id ?? "").startsWith("new-")) {
          return {
            category: l.category,
            subcategory: l.subcategory || null,
            allocated_amount: l.allocated_amount,
          };
        }
        return {
          id: String(l.id ?? ""),
          category: l.category,
          subcategory: l.subcategory || null,
          allocated_amount: l.allocated_amount,
        };
      });

    try {
      await update.mutateAsync({
        id: budget.id,
        data: {
          name: name.trim() || budget.name,
          code: code.trim() || budget.code,
          allocated_amount: String(linesTotal),
          currency,
          lines: payload_lines,
        },
      });
      setOpen(false);
      onSuccess?.();
    } catch { /* error via update.error */ }
  };

  const submitError =
    update.isError && update.error instanceof ApiError
      ? update.error.message
      : update.isError
      ? "Failed to update budget"
      : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Budget</DialogTitle>
          <DialogDescription>
            Update budget details, adjust budget lines, and review the impact before saving.
          </DialogDescription>
        </DialogHeader>
        <form id="edit-budget-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="INR"
              />
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current Allocated</p>
              <p className="text-base font-semibold">
                {currency} {originalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Edited Allocated</p>
              <p className="text-base font-semibold">
                {currency} {linesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Delta</p>
              <p className={cn("text-sm font-semibold", totalDelta > 0 ? "text-emerald-700" : totalDelta < 0 ? "text-rose-700" : "text-foreground")}>
                {totalDelta > 0 ? "+" : totalDelta < 0 ? "-" : ""}{currency} {Math.abs(totalDelta).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Active Lines</p>
              <p className="text-sm font-semibold">{activeLineCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Increase</p>
              <p className="text-sm font-semibold text-emerald-700">
                {currency} {increasedBy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Locked Lines</p>
              <p className="text-sm font-semibold">{lockedLineCount}</p>
            </div>
          </div>

          {/* Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Budget Lines</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
              </Button>
            </div>

            {activeLines.map((line) => {
                const locked = isLineLocked(line);
                const minAmount = getLineMinimumAmount(line);
                return (
                  <div key={line.id} className="rounded-xl border border-border bg-background p-3 space-y-3">
                    <div className="grid gap-3 md:grid-cols-[1.2fr_1.2fr_0.8fr_auto] md:items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Category *</Label>
                          <Select
                          value={normalizeBudgetSelectId(line.category)}
                          onValueChange={(v) => updateLine(line.id, { category: v })}
                          disabled={locked}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={normalizeBudgetSelectId(c.id)}>
                                {c.name} ({c.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Subcategory</Label>
                        <Select
                          value={normalizeBudgetSelectId(line.subcategory)}
                          onValueChange={(v) => updateLine(line.id, { subcategory: v || null })}
                          disabled={!line.category || locked}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={!line.category ? "Select category first" : "Optional..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {line.category &&
                              subcategories
                                .filter((sc) => normalizeBudgetSelectId(sc.category) === normalizeBudgetSelectId(line.category))
                                .map((sc) => (
                                  <SelectItem key={sc.id} value={normalizeBudgetSelectId(sc.id)}>
                                    {sc.name} ({sc.code})
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Amount *</Label>
                        <Input
                          value={line.allocated_amount}
                          onChange={(e) => updateLine(line.id, { allocated_amount: e.target.value })}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(line.id)}
                        disabled={locked}
                        className="shrink-0 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                      <div className="rounded-md bg-muted/30 px-2.5 py-2">
                        Reserved: <span className="font-medium text-foreground">{currency} {parseFloat(line.reserved_amount || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="rounded-md bg-muted/30 px-2.5 py-2">
                        Consumed: <span className="font-medium text-foreground">{currency} {parseFloat(line.consumed_amount || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="rounded-md bg-muted/30 px-2.5 py-2">
                        Available: <span className="font-medium text-foreground">{currency} {parseFloat(line.available_amount || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {locked && (
                      <p className="text-[11px] text-muted-foreground">
                        This line has live usage. Category mapping cannot be changed, but amount can still be increased or reduced only down to {currency} {minAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                      </p>
                    )}
                  </div>
                );
              })}

            {activeLineCount === 0 && (
              <p className="text-sm text-muted-foreground py-2">
                No lines yet. Add one above.
              </p>
            )}
          </div>

          {(clientError || submitError) && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {clientError || submitError}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            type="submit"
            form="edit-budget-form"
            disabled={update.isPending || !name.trim() || !code.trim() || activeLineCount === 0}
          >
            {update.isPending ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving...</>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Budget Dialog ─────────────────────────────────────────────────────

function DeleteBudgetDialog({
  budget,
  onSuccess,
}: {
  budget: Budget;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const del = useDeleteBudget();

  const handleDelete = async () => {
    try {
      await del.mutateAsync(budget.id);
      setOpen(false);
      onSuccess?.();
    } catch { /* error via del.error */ }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Budget</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete this budget?
        </p>
        {del.isError && del.error instanceof ApiError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {del.error.message}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
            {del.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Rule Dialog ────────────────────────────────────────────────────────

function CreateRuleDialog({
  budgetId,
  onSuccess,
}: {
  budgetId: string | null;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateRule();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateRuleRequest & { budget_id: string }>();

  const onSubmit = async (data: Record<string, string>) => {
    try {
      await create.mutateAsync({ budget: data.budget_id });
      setOpen(false);
      reset();
      onSuccess?.();
    } catch { /* error via create.error */ }
  };

  const submitError =
    create.isError && create.error instanceof ApiError
      ? create.error.message
      : create.isError
      ? "Failed to create rule"
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5" disabled={!budgetId}>
          <Plus className="h-4 w-4" />
          New Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Budget Rule</DialogTitle>
        </DialogHeader>
        <form id="create-rule-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-3 text-xs text-blue-900 dark:text-blue-200">
            A rule will be created with default threshold values. You can edit them after creation.
          </div>
          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="create-rule-form" disabled={isSubmitting || create.isPending}>
            {create.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Creating...</> : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Rule Dialog ──────────────────────────────────────────────────────────

function EditRuleDialog({
  rule,
  onSuccess,
}: {
  rule: BudgetRule;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const update = useUpdateRule();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<{
    warning_threshold_percent: string;
    approval_threshold_percent: string;
    hard_block_threshold_percent: string;
    allowed_variance_percent: string;
    require_hod_approval_on_variance: boolean;
  }>({
    defaultValues: {
      warning_threshold_percent: rule.warning_threshold_percent,
      approval_threshold_percent: rule.approval_threshold_percent,
      hard_block_threshold_percent: rule.hard_block_threshold_percent,
      allowed_variance_percent: rule.allowed_variance_percent,
      require_hod_approval_on_variance: rule.require_hod_approval_on_variance,
    },
  });

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      await update.mutateAsync({ id: rule.id, data: data as Record<string, string | boolean> });
      setOpen(false);
      onSuccess?.();
    } catch { /* error via update.error */ }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Budget Rule</DialogTitle>
        </DialogHeader>
        <form id="edit-rule-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Warning %</Label>
              <Input
                {...register("warning_threshold_percent", { required: "Required" })}
                type="number"
                step="0.01"
                min="0"
                className={errors.warning_threshold_percent ? "border-destructive" : ""}
              />
              {errors.warning_threshold_percent && <FieldError message={errors.warning_threshold_percent.message} />}
            </div>
            <div className="space-y-1.5">
              <Label>Approval %</Label>
              <Input
                {...register("approval_threshold_percent", { required: "Required" })}
                type="number"
                step="0.01"
                min="0"
                className={errors.approval_threshold_percent ? "border-destructive" : ""}
              />
              {errors.approval_threshold_percent && <FieldError message={errors.approval_threshold_percent.message} />}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Hard Block %</Label>
              <Input
                {...register("hard_block_threshold_percent", { required: "Required" })}
                type="number"
                step="0.01"
                min="0"
                className={errors.hard_block_threshold_percent ? "border-destructive" : ""}
              />
              {errors.hard_block_threshold_percent && <FieldError message={errors.hard_block_threshold_percent.message} />}
            </div>
            <div className="space-y-1.5">
              <Label>Allowed Variance %</Label>
              <Input
                {...register("allowed_variance_percent", { required: "Required" })}
                type="number"
                step="0.01"
                min="0"
                className={errors.allowed_variance_percent ? "border-destructive" : ""}
              />
              {errors.allowed_variance_percent && <FieldError message={errors.allowed_variance_percent.message} />}
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="edit-rule-form" disabled={isSubmitting || update.isPending}>
            {update.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Rule Dialog ────────────────────────────────────────────────────────

function DeleteRuleDialog({
  rule,
  onSuccess,
}: {
  rule: BudgetRule;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const del = useDeleteRule();

  const handleDelete = async () => {
    try {
      await del.mutateAsync(rule.id);
      setOpen(false);
      onSuccess?.();
    } catch { /* error via del.error */ }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Rule</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete this rule? Budget reservations will fall back to defaults.
        </p>
        {del.isError && del.error instanceof ApiError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {del.error.message}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
            {del.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Review Variance Dialog ─────────────────────────────────────────────────────

function ReviewVarianceDialog({
  varianceRequest,
  onSuccess,
}: {
  varianceRequest: BudgetVarianceRequest;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const review = useReviewVarianceRequest();
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ review_note: string }>();

  const onSubmit = async (data: Record<string, string>) => {
    if (!decision) return;
    try {
      await review.mutateAsync({ id: varianceRequest.id, data: { decision, review_note: data.review_note } });
      setOpen(false);
      setDecision(null);
      onSuccess?.();
    } catch { /* error via review.error */ }
  };

  const submitError =
    review.isError && review.error instanceof ApiError
      ? review.error.message
      : review.isError
      ? "Failed to submit review"
      : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDecision(null); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          Review
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Variance Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-medium">{varianceRequest.budget_name ?? varianceRequest.budget}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requested Amount</span>
              <span className="font-medium">{parseFloat(varianceRequest.requested_amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Utilization</span>
              <span className="font-medium">{varianceRequest.current_utilization_percent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Projected Utilization</span>
              <span className="font-medium">{varianceRequest.projected_utilization_percent}%</span>
            </div>
            {varianceRequest.reason && (
              <div className="pt-1 border-t border-border">
                <span className="text-muted-foreground">Reason: </span>
                <span>{varianceRequest.reason}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Decision *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={decision === "approved" ? "default" : "outline"}
                size="sm"
                className="gap-1.5 flex-1"
                onClick={() => setDecision("approved")}
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
              <Button
                type="button"
                variant={decision === "rejected" ? "destructive" : "outline"}
                size="sm"
                className="gap-1.5 flex-1"
                onClick={() => setDecision("rejected")}
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>

          <form id="review-variance-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Review Note</Label>
              <Textarea {...register("review_note")} placeholder="Optional note..." rows={3} />
            </div>
            {submitError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
            )}
          </form>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            type="submit"
            form="review-variance-form"
            disabled={!decision || isSubmitting || review.isPending}
          >
            {review.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Submitting...</> : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── List Renderers ─────────────────────────────────────────────────────────────

function CategoryList({
  categories,
  isLoading,
}: {
  categories: BudgetCategory[];
  isLoading: boolean;
}) {
  if (isLoading) return <PageLoading />;
  if (categories.length === 0) {
    return <EmptyState message="No categories found. Create one above." icon={FolderOpen} />;
  }
  return (
    <div className="divide-y divide-border">
      {categories.map((cat) => (
        <div key={cat.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50">
          <div>
            <p className="text-sm font-medium">{cat.name}</p>
            <p className="text-xs text-muted-foreground">Code: {cat.code} &middot; {cat.is_active ? "Active" : "Inactive"}</p>
          </div>
          <div className="flex items-center gap-1">
            <EditCategoryDialog category={cat} />
            <DeleteCategoryDialog category={cat} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SubCategoryList({
  subcategories,
  isLoading,
}: {
  subcategories: BudgetSubCategory[];
  isLoading: boolean;
}) {
  if (isLoading) return <PageLoading />;
  if (subcategories.length === 0) {
    return <EmptyState message="No subcategories found." icon={Folder} />;
  }
  return (
    <div className="divide-y divide-border">
      {subcategories.map((sc) => (
        <div key={sc.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50">
          <div>
            <p className="text-sm font-medium">{sc.name}</p>
            <p className="text-xs text-muted-foreground">
              Code: {sc.code} &middot; Category: {sc.category_name ?? sc.category} &middot; {sc.is_active ? "Active" : "Inactive"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <EditSubCategoryDialog subcategory={sc} />
            <DeleteSubCategoryDialog subcategory={sc} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BudgetList({
  budgets,
  isLoading,
}: {
  budgets: Budget[];
  isLoading: boolean;
}) {
  if (isLoading) return <PageLoading />;
  if (budgets.length === 0) {
    return <EmptyState message="No budgets found." icon={Wallet} />;
  }

  return (
    <div className="space-y-4 px-4 py-4">
      {budgets.map((budget) => (
        <BudgetAllocationCard key={budget.id} budget={budget} />
      ))}
    </div>
  );
}

function buildBudgetCategoryGroups(lines: BudgetLine[] | undefined) {
  const groups = new Map<string, {
    key: string;
    name: string;
    lines: BudgetLine[];
    allocated: number;
    reserved: number;
    consumed: number;
    available: number;
    utilization: number;
  }>();

  for (const line of lines ?? []) {
    const groupKey = line.category ?? line.category_name ?? "uncategorized";
    const groupName = line.category_name ?? "Uncategorized";
    const allocated = parseFloat(line.allocated_amount ?? "0");
    const reserved = parseFloat(line.reserved_amount ?? "0");
    const consumed = parseFloat(line.consumed_amount ?? "0");
    const available = allocated - reserved - consumed;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        name: groupName,
        lines: [],
        allocated: 0,
        reserved: 0,
        consumed: 0,
        available: 0,
        utilization: 0,
      });
    }

    const group = groups.get(groupKey)!;
    group.lines.push(line);
    group.allocated += allocated;
    group.reserved += reserved;
    group.consumed += consumed;
    group.available += available;
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      lines: [...group.lines].sort((a, b) => {
        const aName = a.subcategory_name ?? a.category_name ?? "";
        const bName = b.subcategory_name ?? b.category_name ?? "";
        return aName.localeCompare(bName);
      }),
      utilization: group.allocated > 0 ? ((group.reserved + group.consumed) / group.allocated) * 100 : 0,
    }))
    .sort((a, b) => b.allocated - a.allocated);
}

function BudgetAllocationCard({
  budget,
  defaultOpen = false,
}: {
  budget: Budget;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const allocated = parseFloat(budget.allocated_amount ?? "0");
  const reserved = parseFloat(budget.reserved_amount ?? "0");
  const consumed = parseFloat(budget.consumed_amount ?? "0");
  const available = allocated - reserved - consumed;
  const utilization = allocated > 0 ? ((reserved + consumed) / allocated) * 100 : 0;
  const categoryGroups = buildBudgetCategoryGroups(budget.lines);
  const categoryCount = categoryGroups.length;
  const subcategoryCount = categoryGroups.reduce((sum, group) => sum + group.lines.length, 0);

  const toggleCategory = (key: string) => {
    setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div
        className="flex cursor-pointer flex-col gap-4 border-b border-border px-4 py-4 hover:bg-accent/20 md:flex-row md:items-start md:justify-between"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <p className="text-sm font-semibold text-foreground">{budget.name}</p>
            <span className="text-xs text-muted-foreground">({budget.code})</span>
            <BudgetStatusBadge status={budget.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {budget.scope_node_name ?? budget.scope_node} &middot; FY {budget.financial_year} &middot; {categoryCount} categor{categoryCount === 1 ? "y" : "ies"} &middot; {subcategoryCount} subcategor{subcategoryCount === 1 ? "y" : "ies"}
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Allocated</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">{fmtCurrency(allocated)}</p>
            </div>
            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reserved</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">{fmtCurrency(reserved)}</p>
            </div>
            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Consumed</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">{fmtCurrency(consumed)}</p>
            </div>
            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Available</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">{fmtCurrency(available)}</p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-3">
          <div className="min-w-[132px] rounded-lg border bg-background/70 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Utilization</p>
            <p className={cn(
              "mt-1 text-sm font-semibold tabular-nums",
              utilization >= 90 ? "text-red-600" : utilization >= 70 ? "text-amber-600" : "text-emerald-600"
            )}>{utilization.toFixed(1)}%</p>
            <div className="mt-2 flex justify-end">
              <UtilBar pct={utilization} />
            </div>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <EditBudgetDialog budget={budget} />
            <DeleteBudgetDialog budget={budget} />
          </div>
        </div>
      </div>

      {open && (
        <div className="bg-background/50 px-4 py-4">
          {categoryGroups.length === 0 ? (
            <EmptyState message="No category allocations configured for this budget." icon={FolderOpen} />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[minmax(0,1.8fr)_repeat(4,minmax(88px,0.7fr))] gap-2 bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <div>Category / Subcategory</div>
                <div className="text-right">Allocated</div>
                <div className="text-right">Reserved</div>
                <div className="text-right">Consumed</div>
                <div className="text-right">Available</div>
              </div>

              {categoryGroups.map((group) => {
                const isCategoryOpen = openCategories[group.key] ?? false;

                return (
                  <div key={group.key} className="border-t border-border first:border-t-0">
                    <div
                      className="grid cursor-pointer grid-cols-[minmax(0,1.8fr)_repeat(4,minmax(88px,0.7fr))] gap-2 bg-card px-3 py-3 hover:bg-accent/20"
                      onClick={() => toggleCategory(group.key)}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {isCategoryOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.lines.length} line{group.lines.length !== 1 ? "s" : ""} &middot; Utilization {group.utilization.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm font-medium tabular-nums">{fmtCurrency(group.allocated)}</div>
                      <div className="text-right text-sm font-medium tabular-nums">{fmtCurrency(group.reserved)}</div>
                      <div className="text-right text-sm font-medium tabular-nums">{fmtCurrency(group.consumed)}</div>
                      <div className="text-right text-sm font-medium tabular-nums">{fmtCurrency(group.available)}</div>
                    </div>

                    {isCategoryOpen && (
                      <div className="bg-secondary/20">
                        {group.lines.map((line) => {
                          const lineAllocated = parseFloat(line.allocated_amount ?? "0");
                          const lineReserved = parseFloat(line.reserved_amount ?? "0");
                          const lineConsumed = parseFloat(line.consumed_amount ?? "0");
                          const lineAvailable = lineAllocated - lineReserved - lineConsumed;

                          return (
                            <div
                              key={line.id}
                              className="grid grid-cols-[minmax(0,1.8fr)_repeat(4,minmax(88px,0.7fr))] gap-2 border-t border-border/70 px-3 py-2 text-sm"
                            >
                              <div className="min-w-0 pl-6">
                                <p className="truncate text-foreground">{line.subcategory_name ?? "Direct allocation"}</p>
                              </div>
                              <div className="text-right tabular-nums text-muted-foreground">{fmtCurrency(lineAllocated)}</div>
                              <div className="text-right tabular-nums text-muted-foreground">{fmtCurrency(lineReserved)}</div>
                              <div className="text-right tabular-nums text-muted-foreground">{fmtCurrency(lineConsumed)}</div>
                              <div className="text-right tabular-nums text-muted-foreground">{fmtCurrency(lineAvailable)}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RuleList({
  rules,
  isLoading,
}: {
  rules: BudgetRule[];
  isLoading: boolean;
}) {
  if (isLoading) return <PageLoading />;
  if (rules.length === 0) {
    return <EmptyState message="No rules found." icon={GitBranch} />;
  }
  return (
    <div className="divide-y divide-border">
      {rules.map((r) => (
        <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium">{r.budget_name ?? `Budget ${r.budget}`}</p>
              {!r.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              Warn: {r.warning_threshold_percent}% &middot; Approve: {r.approval_threshold_percent}%
              &middot; Block: {r.hard_block_threshold_percent}% &middot; Variance: {r.allowed_variance_percent}%
            </p>
          </div>
          <div className="flex items-center gap-1 ml-4 shrink-0">
            <EditRuleDialog rule={r} />
            <DeleteRuleDialog rule={r} />
          </div>
        </div>
      ))}
    </div>
  );
}

function VarianceRequestList({
  varianceRequests,
  isLoading,
}: {
  varianceRequests: BudgetVarianceRequest[];
  isLoading: boolean;
}) {
  if (isLoading) return <PageLoading />;
  if (varianceRequests.length === 0) {
    return <EmptyState message="No variance requests found." icon={AlertTriangle} />;
  }
  return (
    <div className="divide-y divide-border">
      {varianceRequests.map((vr) => (
        <div key={vr.id} className="px-4 py-3 hover:bg-accent/50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium">{vr.budget_name ?? `Budget ${vr.budget}`}</p>
                <VarianceStatusBadge status={vr.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {SOURCE_TYPE_LABELS[vr.source_type] ?? vr.source_type} › {vr.source_id} &middot; Amount: {parseFloat(vr.requested_amount).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Util: {vr.current_utilization_percent}% → {vr.projected_utilization_percent}%
              </p>
              {vr.reason && <p className="text-xs text-muted-foreground mt-0.5">Reason: {vr.reason}</p>}
            </div>
            {vr.status === "pending" && (
              <ReviewVarianceDialog varianceRequest={vr} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsumptionList({
  consumptions,
  isLoading,
}: {
  consumptions: BudgetConsumption[];
  isLoading: boolean;
}) {
  if (isLoading) return <PageLoading />;
  if (consumptions.length === 0) {
    return <EmptyState message="No consumptions recorded." icon={ArrowDownToLine} />;
  }
  return (
    <div className="divide-y divide-border">
      {consumptions.map((c) => (
        <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ConsumptionTypeBadge ct={c.consumption_type} />
              <span className="text-sm font-medium">{parseFloat(c.amount).toLocaleString()}</span>
              <Badge variant="outline" className="text-xs">{c.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {SOURCE_TYPE_LABELS[c.source_type] ?? c.source_type} › {c.source_id}
              &middot; Budget: {c.budget_name ?? c.budget}
            </p>
            {c.note && <p className="text-xs text-muted-foreground mt-0.5">{c.note}</p>}
          </div>
          <p className="text-xs text-muted-foreground ml-4 shrink-0">
            {new Date(c.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmtCurrency(amount: string | number | null | undefined): string {
  if (amount == null || amount === "") return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function UtilBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="h-1.5 bg-secondary rounded-full overflow-hidden w-20">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

// ── KPI Strip ─────────────────────────────────────────────────────────────────

function KpiStrip({ data }: { data: any }) {
  const s = data?.summary;
  if (!s) return null;
  const kpis = [
    { label: "Total Allocated", value: fmtCurrency(s.total_allocated), icon: DollarSign, color: "text-blue-600" },
    { label: "Reserved", value: fmtCurrency(s.total_reserved), icon: Bookmark, color: "text-amber-600" },
    { label: "Consumed", value: fmtCurrency(s.total_consumed), icon: ArrowDownToLine, color: "text-orange-600" },
    { label: "Available", value: fmtCurrency(s.total_available), icon: Wallet, color: "text-green-600" },
    { label: "Regions", value: String(s.regions_count), icon: MapPin, color: "text-purple-600" },
    { label: "Parks", value: String(s.parks_count), icon: Target, color: "text-cyan-600" },
    { label: "Budget Lines", value: String(s.budgets_count), icon: BarChart3, color: "text-indigo-600" },
    { label: "Campaigns", value: String(s.campaigns_count), icon: TrendingUp, color: "text-pink-600" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {kpis.map((k) => (
        <div key={k.label} className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <k.icon className={cn("h-3.5 w-3.5", k.color)} />
            <span className="text-[10px] text-muted-foreground leading-none">{k.label}</span>
          </div>
          <p className="text-sm font-bold text-foreground truncate">{k.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Region Cards ───────────────────────────────────────────────────────────────

const SCOPE_CARD_ACCENTS = [
  "border-l-slate-400",
  "border-l-blue-400",
  "border-l-green-400",
  "border-l-orange-400",
  "border-l-purple-400",
  "border-l-cyan-400",
  "border-l-pink-400",
];

function buildRegionSummariesFromBudgets(budgets: Budget[], nodes: ScopeNode[]) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const groups = new Map<string, {
    id: string;
    name: string;
    path: string;
    depth: number;
    allocated_amount: string;
    reserved_amount: string;
    consumed_amount: string;
    available_amount: string;
    utilization_percent: number;
    parks_count: number;
    budgets_count: number;
  }>();

  for (const budget of budgets) {
    const scopeNode = nodeMap.get(budget.scope_node);
    const name = budget.scope_node_name ?? scopeNode?.name ?? budget.scope_node ?? "Unassigned";
    const key = budget.scope_node ?? name;
    const allocated = parseFloat(budget.allocated_amount ?? "0");
    const reserved = parseFloat(budget.reserved_amount ?? "0");
    const consumed = parseFloat(budget.consumed_amount ?? "0");

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        name,
        path: scopeNode?.path ?? name,
        depth: scopeNode?.depth ?? 0,
        allocated_amount: "0",
        reserved_amount: "0",
        consumed_amount: "0",
        available_amount: "0",
        utilization_percent: 0,
        parks_count: 0,
        budgets_count: 0,
      });
    }

    const group = groups.get(key)!;
    const currentAllocated = parseFloat(group.allocated_amount);
    const currentReserved = parseFloat(group.reserved_amount);
    const currentConsumed = parseFloat(group.consumed_amount);
    const nextAllocated = currentAllocated + allocated;
    const nextReserved = currentReserved + reserved;
    const nextConsumed = currentConsumed + consumed;
    const nextAvailable = nextAllocated - nextReserved - nextConsumed;

    group.allocated_amount = String(nextAllocated);
    group.reserved_amount = String(nextReserved);
    group.consumed_amount = String(nextConsumed);
    group.available_amount = String(nextAvailable);
    group.utilization_percent = nextAllocated > 0 ? Number((((nextReserved + nextConsumed) / nextAllocated) * 100).toFixed(1)) : 0;
    group.budgets_count += 1;
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.path.localeCompare(b.path);
  });
}

function RegionCards({ regions }: { regions: any[] }) {
  if (!regions?.length) return null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {regions.map((r, index) => (
        <div key={r.id} className={cn(
          "rounded-lg border bg-card p-3 border-l-4 pl-3",
          SCOPE_CARD_ACCENTS[index % SCOPE_CARD_ACCENTS.length]
        )}>
          <p className="text-sm font-semibold text-foreground mb-2">{r.name}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Allocated</span>
              <span className="font-medium tabular-nums">{fmtCurrency(r.allocated_amount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Available</span>
              <span className="font-medium tabular-nums">{fmtCurrency(r.available_amount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Budgets</span>
              <span className="font-medium">{r.budgets_count}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Utilization</span>
              <span className={cn(
                "text-[10px] font-bold tabular-nums",
                r.utilization_percent >= 90 ? "text-red-600" : r.utilization_percent >= 70 ? "text-amber-600" : "text-green-600"
              )}>{r.utilization_percent}%</span>
            </div>
            <UtilBar pct={r.utilization_percent} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Region / Park Matrix ───────────────────────────────────────────────────────

type ScopeBudgetTreeNode = {
  id: string;
  name: string;
  path: string;
  depth: number;
  budgets: Budget[];
  children: ScopeBudgetTreeNode[];
  allocated: number;
  reserved: number;
  consumed: number;
  available: number;
  utilization: number;
};

function buildScopeBudgetTree(nodes: ScopeNode[], budgets: Budget[]): ScopeBudgetTreeNode[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const budgetNodeIds = new Set<string>();

  for (const budget of budgets) {
    if (budget.scope_node) budgetNodeIds.add(budget.scope_node);
  }

  const relevantNodeIds = new Set<string>();
  for (const nodeId of budgetNodeIds) {
    let currentId: string | null | undefined = nodeId;
    while (currentId) {
      if (relevantNodeIds.has(currentId)) break;
      relevantNodeIds.add(currentId);
      currentId = nodeMap.get(currentId)?.parent;
    }
  }

  const treeMap = new Map<string, ScopeBudgetTreeNode>();
  for (const id of relevantNodeIds) {
    const node = nodeMap.get(id);
    if (!node) continue;
    const directBudgets = budgets
      .filter((budget) => budget.scope_node === id)
      .sort((a, b) => a.name.localeCompare(b.name));
    const allocated = directBudgets.reduce((sum, budget) => sum + parseFloat(budget.allocated_amount ?? "0"), 0);
    const reserved = directBudgets.reduce((sum, budget) => sum + parseFloat(budget.reserved_amount ?? "0"), 0);
    const consumed = directBudgets.reduce((sum, budget) => sum + parseFloat(budget.consumed_amount ?? "0"), 0);
    treeMap.set(id, {
      id,
      name: node.name,
      path: node.path,
      depth: node.depth,
      budgets: directBudgets,
      children: [],
      allocated,
      reserved,
      consumed,
      available: allocated - reserved - consumed,
      utilization: allocated > 0 ? ((reserved + consumed) / allocated) * 100 : 0,
    });
  }

  const roots: ScopeBudgetTreeNode[] = [];
  for (const [id, treeNode] of treeMap.entries()) {
    const parentId = nodeMap.get(id)?.parent;
    if (parentId && treeMap.has(parentId)) {
      treeMap.get(parentId)!.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  const finalize = (node: ScopeBudgetTreeNode): ScopeBudgetTreeNode => {
    node.children = node.children
      .map(finalize)
      .sort((a, b) => a.path.localeCompare(b.path));
    const childAllocated = node.children.reduce((sum, child) => sum + child.allocated, 0);
    const childReserved = node.children.reduce((sum, child) => sum + child.reserved, 0);
    const childConsumed = node.children.reduce((sum, child) => sum + child.consumed, 0);
    node.allocated += childAllocated;
    node.reserved += childReserved;
    node.consumed += childConsumed;
    node.available = node.allocated - node.reserved - node.consumed;
    node.utilization = node.allocated > 0 ? ((node.reserved + node.consumed) / node.allocated) * 100 : 0;
    return node;
  };

  return roots
    .map(finalize)
    .sort((a, b) => a.path.localeCompare(b.path));
}

function ScopeBudgetTreeRow({
  node,
  level = 0,
}: {
  node: ScopeBudgetTreeNode;
  level?: number;
}) {
  const [open, setOpen] = useState(level < 1);
  const hasChildren = node.children.length > 0;
  const hasBudgets = node.budgets.length > 0;
  const canExpand = hasChildren || hasBudgets;

  return (
    <div className="border-b border-border last:border-0">
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1.8fr)_repeat(4,minmax(88px,0.7fr))] gap-2 px-3 py-2 hover:bg-accent/30",
          canExpand ? "cursor-pointer" : ""
        )}
        onClick={() => canExpand && setOpen((prev) => !prev)}
      >
        <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${level * 14}px` }}>
          <span className="w-4 shrink-0">
            {canExpand ? (open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />) : null}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{node.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {node.budgets.length} direct budget{node.budgets.length !== 1 ? "s" : ""} &middot; {node.children.length} child node{node.children.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="text-right text-sm font-medium tabular-nums">{fmtCurrency(node.allocated)}</div>
        <div className="text-right text-sm font-medium tabular-nums">{fmtCurrency(node.reserved)}</div>
        <div className="text-right text-sm font-medium tabular-nums">{fmtCurrency(node.consumed)}</div>
        <div className="text-right">
          <div className="text-sm font-medium tabular-nums">{fmtCurrency(node.available)}</div>
          <div className="mt-1 flex items-center justify-end gap-2">
            <UtilBar pct={node.utilization} />
            <span className="text-[10px] tabular-nums text-muted-foreground">{node.utilization.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {open && (
        <div className="bg-secondary/10">
          {hasBudgets && (
            <div className="border-t border-border/70 px-3 py-2">
              <div className="space-y-2">
                {node.budgets.map((budget) => (
                  <div key={budget.id} className="rounded-md border bg-card px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{budget.name}</p>
                        <p className="text-[10px] text-muted-foreground">{budget.code}</p>
                      </div>
                      <div className="text-right text-xs tabular-nums">
                        <p>{fmtCurrency(budget.allocated_amount)}</p>
                        <p className="text-muted-foreground">Available {fmtCurrency((parseFloat(budget.allocated_amount ?? "0") - parseFloat(budget.reserved_amount ?? "0") - parseFloat(budget.consumed_amount ?? "0")))}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {hasChildren && node.children.map((child) => (
            <ScopeBudgetTreeRow key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScopeBudgetMatrix({
  budgets,
  nodes,
}: {
  budgets: Budget[];
  nodes: ScopeNode[];
}) {
  const tree = buildScopeBudgetTree(nodes, budgets);

  if (!tree.length) return null;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-secondary/20 flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scope Budget Matrix</span>
        <span className="text-[10px] text-muted-foreground">Live from scope hierarchy and budget headers</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1.8fr)_repeat(4,minmax(88px,0.7fr))] gap-2 bg-muted/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
        <div>Scope Node</div>
        <div className="text-right">Allocated</div>
        <div className="text-right">Reserved</div>
        <div className="text-right">Consumed</div>
        <div className="text-right">Available</div>
      </div>
      {tree.map((node) => (
        <ScopeBudgetTreeRow key={node.id} node={node} />
      ))}
    </div>
  );
}

// ── Category Chart ────────────────────────────────────────────────────────────

const CAT_COLORS = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#6366f1"];

function CategoryChart({ categories }: { categories: BudgetCategoryOverview[] }) {
  if (!categories?.length) return null;
  const data = categories.slice(0, 10).map((c, i) => ({
    name: c.name.length > 22 ? c.name.slice(0, 22) + "…" : c.name,
    amount: parseFloat(c.allocated_amount || "0"),
    reserved: parseFloat(c.reserved_amount || "0"),
    consumed: parseFloat(c.consumed_amount || "0"),
    available: parseFloat(c.available_amount || "0"),
    count: c.budgets_count,
    color: CAT_COLORS[i % CAT_COLORS.length],
  }));
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded border bg-popover px-3 py-2 text-xs shadow">
                  <p className="font-semibold mb-1">{d.name}</p>
                  <p>Allocated: {fmtCurrency(d.amount)}</p>
                  <p>Reserved: {fmtCurrency(d.reserved)}</p>
                  <p>Consumed: {fmtCurrency(d.consumed)}</p>
                  <p className="text-emerald-600">Available: {fmtCurrency(d.available)}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="amount" radius={[3, 3, 0, 0]} name="Allocated">
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Campaign Table ────────────────────────────────────────────────────────────

function CampaignTable({ campaigns }: { campaigns: any[] }) {
  if (!campaigns?.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            {["Campaign", "Location", "Region", "Category", "Subcategory", "Approved Amt", "Status"].map(h => (
              <th key={h} className="pb-1.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 first:pl-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {campaigns.slice(0, 25).map((c: any) => (
            <tr key={c.id} className="hover:bg-accent/30">
              <td className="px-2 py-1.5 font-medium text-foreground truncate max-w-[160px]">{c.name}</td>
              <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[120px]">{c.scope_node_name}</td>
              <td className="px-2 py-1.5 text-muted-foreground">{c.region_name}</td>
              <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[120px]">{c.category_name}</td>
              <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[120px]">{c.subcategory_name}</td>
              <td className="px-2 py-1.5 font-semibold tabular-nums text-right">{fmtCurrency(c.approved_amount)}</td>
              <td className="px-2 py-1.5">
                <span className={cn(
                  "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  c.status === "internally_approved" ? "bg-green-100 text-green-800" :
                  c.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
                )}>{c.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Budgets Dashboard Tab ──────────────────────────────────────────────────────

function BudgetsDashboardTab({
  budgets,
  budgetsLoading,
  nodes,
}: {
  budgets: Budget[];
  budgetsLoading: boolean;
  nodes: ScopeNode[];
}) {
  const { data, isLoading } = useBudgetOverview();
  const derivedRegions = buildRegionSummariesFromBudgets(budgets, nodes);

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[360px] items-center justify-center text-sm text-muted-foreground">
        No budget overview data available.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-5 px-6 py-5">
        <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-sm shrink-0">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Budget Control Center</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                Marketing budget by region, category, campaign, and utilization
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Live view of seeded FY budget lines, available funds, campaign coverage, and regional allocation health.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 px-4 py-3 text-right">
              <p className="text-xs text-muted-foreground">Total available</p>
              <p className="text-xl font-semibold tabular-nums text-emerald-500">
                {fmtCurrency(data.summary?.total_available ?? 0)}
              </p>
            </div>
          </div>
        </div>

      {/* KPI Strip */}
      <KpiStrip data={data} />

      {/* Region Cards */}
      {derivedRegions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Budget by Region</p>
          <RegionCards regions={derivedRegions} />
        </div>
      )}

      {/* Two column: Park Matrix + Category Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ScopeBudgetMatrix budgets={budgets} nodes={nodes} />
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-secondary/20 flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category Breakdown</span>
            </div>
            <div className="p-3">
              <CategoryChart categories={data.categories} />
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Activity */}
      {data.campaigns?.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-secondary/20 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campaign Activity</span>
            <span className="ml-1 text-[10px] text-muted-foreground">({data.campaigns.length} total)</span>
          </div>
          <CampaignTable campaigns={data.campaigns} />
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-secondary/20 flex items-center gap-2">
          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Budget Allocation Drilldown</span>
          <span className="ml-1 text-[10px] text-muted-foreground">Budget → Category → Subcategory</span>
        </div>
        <BudgetList budgets={budgets} isLoading={budgetsLoading} />
      </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Budget Import UI
// ─────────────────────────────────────────────────────────────────────────────

const IMPORT_BATCH_STATUS_COLORS: Record<ImportBatchStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  validated: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  committed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const IMPORT_ROW_STATUS_COLORS: Record<ImportRowStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  valid: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  committed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  skipped: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function ImportBatchStatusBadge({ status }: { status: ImportBatchStatus }) {
  return (
    <Badge className={IMPORT_BATCH_STATUS_COLORS[status] ?? ""} variant="outline">
      {IMPORT_BATCH_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function ImportRowStatusBadge({ status }: { status: ImportRowStatus }) {
  return (
    <Badge className={IMPORT_ROW_STATUS_COLORS[status] ?? ""} variant="outline">
      {IMPORT_ROW_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ── Upload Panel ──────────────────────────────────────────────────────────────

function UploadPanel({
  orgId,
  onBatchCreated,
}: {
  orgId: string | null;
  onBatchCreated?: (batchId: number) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("safe_update");
  const [financialYear, setFinancialYear] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const upload = useUploadBudgetImportBatch();
  const fileRef = useState<HTMLInputElement | null>(null)[1];

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      const batch = await upload.mutateAsync({
        file,
        financial_year: financialYear || undefined,
        import_mode: importMode,
        org: orgId ?? undefined,
      });
      setFile(null);
      setFinancialYear("");
      onBatchCreated?.(batch.id);
    } catch { /* error rendered below */ }
  };

  const uploadError =
    upload.isError && upload.error instanceof ApiError
      ? upload.error.message
      : upload.isError
      ? "Upload failed"
      : null;

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Upload Budget Excel</h3>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-md px-6 py-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        )}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".xlsx,.xls";
          input.onchange = (e) => {
            const f = (e.target as HTMLInputElement).files?.[0];
            if (f) handleFile(f);
          };
          input.click();
        }}
      >
        <FileSpreadsheet className="h-8 w-8 text-muted-foreground opacity-60" />
        {file ? (
          <div className="text-center">
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Drop an Excel file here or click to browse</p>
            <p className="text-xs text-muted-foreground">.xlsx or .xls only</p>
          </div>
        )}
      </div>

      {/* Options row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Import Mode *</Label>
          <Select value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["setup_only", "safe_update", "full"] as ImportMode[]).map((m) => (
                <SelectItem key={m} value={m}>{IMPORT_MODE_LABELS[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {IMPORT_MODE_DESCRIPTIONS[importMode]}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Financial Year (optional)</Label>
          <Input
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            placeholder="e.g. 2025-26"
            className="h-9"
          />
          <p className="text-[11px] text-muted-foreground">Stored on the batch for reference only.</p>
        </div>
      </div>

      {uploadError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {uploadError}
        </p>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || upload.isPending}
        className="gap-1.5"
      >
        {upload.isPending
          ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading...</>
          : <><Upload className="h-4 w-4" />Upload &amp; Parse</>
        }
      </Button>
    </div>
  );
}

// ── Batch List ────────────────────────────────────────────────────────────────

function BatchListPanel({
  batches,
  isLoading,
  selectedId,
  onSelect,
}: {
  batches: BudgetImportBatchList[];
  isLoading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (isLoading) return <PageLoading />;
  if (!batches.length) return <EmptyState message="No import batches yet. Upload a file above." icon={FileSpreadsheet} />;

  return (
    <div className="divide-y divide-border rounded-lg border overflow-hidden">
      {batches.map((b) => (
        <button
          key={b.id}
          onClick={() => onSelect(b.id)}
          className={cn(
            "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-accent/50 transition-colors",
            selectedId === b.id && "bg-accent",
          )}
        >
          <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate">{b.file_name}</span>
              <ImportBatchStatusBadge status={b.status} />
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {IMPORT_MODE_LABELS[b.import_mode]}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {b.financial_year && <span>FY {b.financial_year}</span>}
              <span>{new Date(b.created_at).toLocaleString()}</span>
              {b.created_by_email && <span>by {b.created_by_email}</span>}
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs flex-wrap">
              <span className="text-muted-foreground">Total: <strong>{b.total_rows}</strong></span>
              {b.valid_rows > 0 && (
                <span className="text-blue-600 dark:text-blue-400">Valid: <strong>{b.valid_rows}</strong></span>
              )}
              {b.error_rows > 0 && (
                <span className="text-destructive">Errors: <strong>{b.error_rows}</strong></span>
              )}
              {b.skipped_rows > 0 && (
                <span className="text-muted-foreground">Skipped: <strong>{b.skipped_rows}</strong></span>
              )}
              {b.committed_rows > 0 && (
                <span className="text-green-600 dark:text-green-400">Committed: <strong>{b.committed_rows}</strong></span>
              )}
            </div>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

// ── Row Detail Table ──────────────────────────────────────────────────────────

function ImportRowTable({ rows }: { rows: BudgetImportRow[] }) {
  const [filter, setFilter] = useState<ImportRowStatus | "all">("all");

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const counts = {
    all: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    valid: rows.filter((r) => r.status === "valid").length,
    error: rows.filter((r) => r.status === "error").length,
    skipped: rows.filter((r) => r.status === "skipped").length,
    committed: rows.filter((r) => r.status === "committed").length,
  };

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(["all", "valid", "error", "skipped", "committed", "pending"] as const).map((s) => {
          const count = counts[s];
          if (s !== "all" && count === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                filter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-accent",
              )}
            >
              {s === "all" ? "All" : IMPORT_ROW_STATUS_LABELS[s]} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No rows match this filter.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-secondary/30 border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">#</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Budget Code</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Budget Name</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Scope Node</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Category</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Subcategory</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">Amount</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((row) => (
                <tr key={row.id} className={cn(
                  "hover:bg-accent/30",
                  row.status === "error" && "bg-destructive/5",
                )}>
                  <td className="px-3 py-2 text-muted-foreground">{row.row_number}</td>
                  <td className="px-3 py-2"><ImportRowStatusBadge status={row.status} /></td>
                  <td className="px-3 py-2 font-mono">{row.raw_budget_code || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 max-w-[160px] truncate" title={row.raw_budget_name}>{row.raw_budget_name || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 font-mono">{row.raw_scope_node_code || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 font-mono">{row.raw_category_code || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 font-mono">{row.raw_subcategory_code || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.raw_allocated_amount
                      ? `${row.raw_currency || ""} ${row.raw_allocated_amount}`.trim()
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 max-w-[220px]">
                    {row.errors.length > 0 && (
                      <ul className="space-y-0.5">
                        {row.errors.map((e, i) => (
                          <li key={i} className="text-destructive text-[11px] leading-snug">
                            {e}
                          </li>
                        ))}
                      </ul>
                    )}
                    {row.skipped_reason && (
                      <p className="text-muted-foreground text-[11px] italic">{row.skipped_reason}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Batch Detail Panel ────────────────────────────────────────────────────────

function BatchDetailPanel({
  batchId,
  onClose,
}: {
  batchId: number;
  onClose: () => void;
}) {
  const { data: batch, isLoading, refetch } = useBudgetImportBatch(batchId);
  const validate = useValidateBudgetImportBatch();
  const commit = useCommitBudgetImportBatch();

  const handleValidate = async () => {
    try {
      await validate.mutateAsync(batchId);
      refetch();
    } catch { /* error via validate.error */ }
  };

  const handleCommit = async () => {
    try {
      await commit.mutateAsync(batchId);
      refetch();
    } catch { /* error via commit.error */ }
  };

  const validateError =
    validate.isError && validate.error instanceof ApiError
      ? validate.error.message
      : validate.isError ? "Validation failed" : null;

  const commitError =
    commit.isError && commit.error instanceof ApiError
      ? commit.error.message
      : commit.isError ? "Commit failed" : null;

  if (isLoading) return <PageLoading />;
  if (!batch) return null;

  const canValidate = batch.status === "pending";
  const canCommit = batch.status === "validated" && batch.valid_rows > 0;

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-sm truncate">{batch.file_name}</span>
            <ImportBatchStatusBadge status={batch.status} />
            <Badge variant="outline" className="text-[10px] px-1.5">{IMPORT_MODE_LABELS[batch.import_mode]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Uploaded {new Date(batch.created_at).toLocaleString()}
            {batch.created_by_email && ` by ${batch.created_by_email}`}
            {batch.financial_year && ` · FY ${batch.financial_year}`}
          </p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">
          ← Back
        </button>
      </div>

      {/* Row count summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: "Total", value: batch.total_rows, color: "text-foreground" },
          { label: "Valid", value: batch.valid_rows, color: "text-blue-600 dark:text-blue-400" },
          { label: "Errors", value: batch.error_rows, color: "text-destructive" },
          { label: "Skipped", value: batch.skipped_rows, color: "text-muted-foreground" },
          { label: "Committed", value: batch.committed_rows, color: "text-green-600 dark:text-green-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-md border bg-card px-3 py-2 text-center">
            <p className={cn("text-lg font-bold tabular-nums", color)}>{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Validation errors summary (batch-level) */}
      {batch.validation_errors.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Batch-level validation issues
          </p>
          {batch.validation_errors.map((e, i) => (
            <p key={i} className="text-xs text-destructive">{e}</p>
          ))}
        </div>
      )}

      {/* Committed result */}
      {batch.status === "committed" && (
        <div className="rounded-md border border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-700 px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Batch committed — {batch.committed_rows} row(s) applied
            </p>
            {batch.committed_by_email && (
              <p className="text-xs text-green-600 dark:text-green-400">
                by {batch.committed_by_email} at {batch.committed_at ? new Date(batch.committed_at).toLocaleString() : "—"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action errors */}
      {(validateError || commitError) && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {validateError ?? commitError}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {canValidate && (
          <Button
            onClick={handleValidate}
            disabled={validate.isPending}
            variant="outline"
            className="gap-1.5"
          >
            {validate.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" />Validating...</>
              : <><ShieldCheck className="h-4 w-4" />Validate Batch</>
            }
          </Button>
        )}
        {canCommit && (
          <Button
            onClick={handleCommit}
            disabled={commit.isPending}
            className="gap-1.5"
          >
            {commit.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" />Committing...</>
              : <><Send className="h-4 w-4" />Commit {batch.valid_rows} Valid Row(s)</>
            }
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1 text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Mode info */}
      <div className="flex items-start gap-1.5 text-xs text-muted-foreground rounded-md bg-secondary/30 px-3 py-2">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          <strong>Mode:</strong> {IMPORT_MODE_LABELS[batch.import_mode]} — {IMPORT_MODE_DESCRIPTIONS[batch.import_mode]}
        </span>
      </div>

      {/* Row table */}
      {batch.rows.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Row Detail</h4>
          <ImportRowTable rows={batch.rows} />
        </div>
      )}
    </div>
  );
}

// ── Main Import Panel ─────────────────────────────────────────────────────────

function BudgetImportPanel({ orgId }: { orgId: string | null }) {
  const { data: batches = [], isLoading: batchesLoading, refetch } = useBudgetImportBatches();
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  const handleBatchCreated = (id: number) => {
    refetch();
    setSelectedBatchId(id);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Upload */}
      <UploadPanel orgId={orgId} onBatchCreated={handleBatchCreated} />

      {/* Detail or list */}
      {selectedBatchId !== null ? (
        <div className="space-y-4">
          <BatchDetailPanel
            batchId={selectedBatchId}
            onClose={() => setSelectedBatchId(null)}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent Batches</h3>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1 text-muted-foreground h-7">
              <RotateCcw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
          <BatchListPanel
            batches={batches}
            isLoading={batchesLoading}
            selectedId={selectedBatchId}
            onSelect={setSelectedBatchId}
          />
        </div>
      )}
    </div>
  );
}

export default function BudgetsPage() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("budgets");
  const [budgetViewMode, setBudgetViewMode] = useState<"dashboard" | "list">("dashboard");

  // Filter states per tab
  const [budgetStatusFilter, setBudgetStatusFilter] = useState<string>("all");
  const [varianceStatusFilter, setVarianceStatusFilter] = useState<string>("all");
  const [consumptionFilters, setConsumptionFilters] = useState<{
    source_type?: string;
    consumption_type?: string;
  }>({});

  // List data
  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();
  const { data: nodes = [], isLoading: nodesLoading } = useScopeNodes(selectedOrgId ?? undefined);
  const { data: categories = [], isLoading: catsLoading } = useCategories(
    selectedOrgId ? { org: selectedOrgId } : undefined,
  );
  const activeCategoryId =
    selectedCategoryId && selectedCategoryId !== "__all__" ? selectedCategoryId : null;
  const { data: subcategories = [], isLoading: subsLoading } = useSubCategories(
    activeCategoryId ? { category: activeCategoryId } : undefined,
  );
  const { data: budgets = [], isLoading: budgetsLoading, refetch: refetchBudgets } = useBudgets(
    selectedNodeId && selectedNodeId !== "__all__"
      ? { scope_node: selectedNodeId, status: budgetStatusFilter !== "all" ? budgetStatusFilter : undefined }
      : { status: budgetStatusFilter !== "all" ? budgetStatusFilter : undefined },
  );
  const { data: rules = [], isLoading: rulesLoading } = useRules(
    selectedBudgetId ? { budget: selectedBudgetId } : undefined,
  );
  const { data: consumptions = [], isLoading: consumptionsLoading } = useConsumptions(
    selectedBudgetId
      ? { budget: selectedBudgetId, ...consumptionFilters }
      : consumptionFilters,
  );
  const { data: varianceRequests = [], isLoading: varianceLoading } = useVarianceRequests(
    selectedBudgetId
      ? { budget: selectedBudgetId, status: varianceStatusFilter !== "all" ? varianceStatusFilter : undefined }
      : { status: varianceStatusFilter !== "all" ? varianceStatusFilter : undefined },
  );

  const renderTabToolbar = (): { left: React.ReactNode; right?: React.ReactNode } => {
    switch (activeTab) {
      case "budgets":
        return (
          {
            left: (
              <div className="flex min-h-11 items-center gap-3">
                {/* View mode toggle */}
                <div className="flex items-center border rounded-md overflow-hidden">
                  <button
                    onClick={() => setBudgetViewMode("dashboard")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors",
                      budgetViewMode === "dashboard"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => setBudgetViewMode("list")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors",
                      budgetViewMode === "list"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    <List className="h-3.5 w-3.5" />
                    List
                  </button>
                </div>
                {budgetViewMode === "list" && (
                  <>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={budgetStatusFilter} onValueChange={setBudgetStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="exhausted">Exhausted</SelectItem>
                        <SelectItem value="frozen">Frozen</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            ),
            right: budgetViewMode === "list" ? (
              <CreateBudgetDialog
                orgId={selectedOrgId}
                scopeNodeId={selectedNodeId}
                onSuccess={() => refetchBudgets()}
              />
            ) : null,
          }
        );
      case "categories":
        return (
          {
            left: (
              <div className="flex min-h-11 items-center">
                <p className="text-sm text-muted-foreground">
                  {categories.length} categor{categories.length === 1 ? "y" : "ies"}
                </p>
              </div>
            ),
            right: <CreateCategoryDialog orgId={selectedOrgId} />,
          }
        );
      case "subcategories":
        return (
          {
            left: (
              <div className="flex min-h-11 items-center gap-2">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select
                  value={selectedCategoryId ?? ""}
                  onValueChange={(v) => setSelectedCategoryId(v === "__all__" ? null : v)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ),
            right: (
              <CreateSubCategoryDialog
                categoryId={selectedCategoryId && selectedCategoryId !== "__all__" ? selectedCategoryId : null}
              />
            ),
          }
        );
      case "rules":
        return (
          {
            left: (
              <div className="flex min-h-11 items-center">
                <p className="text-sm text-muted-foreground">
                  Select a budget to filter rules, or create a new one.
                </p>
              </div>
            ),
            right: <CreateRuleDialog budgetId={selectedBudgetId} />,
          }
        );
      case "variance-requests":
        return (
          {
            left: (
              <div className="flex min-h-11 items-center gap-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={varianceStatusFilter} onValueChange={setVarianceStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ),
          }
        );
      case "consumptions":
        return (
          {
            left: (
              <div className="flex min-h-11 items-center">
                <p className="text-xs text-muted-foreground">
                  Read-only ledger. Filter by budget above.
                </p>
              </div>
            ),
          }
        );
      case "imports":
        return (
          {
            left: (
              <div className="flex min-h-11 items-center">
                <p className="text-xs text-muted-foreground">
                  Upload and manage bulk budget import batches.
                </p>
              </div>
            ),
          }
        );
      default:
        return { left: null };
    }
  };

  const toolbar = renderTabToolbar();

  return (
    <V2Shell
      title="Budgets"
      titleIcon={<Wallet className="h-5 w-5 text-muted-foreground" />}
      actions={
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Org</Label>
          {orgsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Select
              value={selectedOrgId ?? ""}
              onValueChange={(v) => {
                setSelectedOrgId(v);
                setSelectedNodeId(null);
                setSelectedCategoryId(null);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Label className="text-xs text-muted-foreground ml-2">Node</Label>
          {nodesLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Select
              value={selectedNodeId ?? ""}
              onValueChange={(v) => setSelectedNodeId(v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All nodes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All nodes</SelectItem>
                {nodes.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      }
    >
      {/* Tabbed content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="overflow-x-auto border-b border-border px-6 pt-3">
            <TabsList className="gap-1">
              <TabsTrigger value="budgets">Budgets</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="subcategories">Subcategories</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="variance-requests">
                Variance Requests
                {varianceRequests.filter((v) => v.status === "pending").length > 0 && (
                  <Badge variant="destructive" className="ml-1.5 text-xs">
                    {varianceRequests.filter((v) => v.status === "pending").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="consumptions">Consumptions</TabsTrigger>
              <TabsTrigger value="imports">
                <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
                Imports
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="grid min-h-[72px] grid-cols-1 items-center gap-4 border-b border-border px-6 py-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">{toolbar.left}</div>
            <div className="flex min-h-11 items-center justify-start md:justify-end">
              {toolbar.right ?? null}
            </div>
          </div>

          {/* BUDGETS TAB */}
          <TabsContent value="budgets" className="m-0 data-[state=inactive]:hidden flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              {budgetViewMode === "dashboard" ? (
                <BudgetsDashboardTab budgets={budgets} budgetsLoading={budgetsLoading} nodes={nodes} />
              ) : (
                <BudgetList budgets={budgets} isLoading={budgetsLoading} />
              )}
            </ScrollArea>
          </TabsContent>

          {/* CATEGORIES TAB */}
          <TabsContent value="categories" className="m-0 data-[state=inactive]:hidden flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <CategoryList categories={categories} isLoading={catsLoading} />
            </ScrollArea>
          </TabsContent>

          {/* SUBCATEGORIES TAB */}
          <TabsContent value="subcategories" className="m-0 data-[state=inactive]:hidden flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <SubCategoryList
                subcategories={subcategories}
                isLoading={subsLoading}
              />
            </ScrollArea>
          </TabsContent>

          {/* RULES TAB */}
          <TabsContent value="rules" className="m-0 data-[state=inactive]:hidden flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <RuleList rules={rules} isLoading={rulesLoading} />
            </ScrollArea>
          </TabsContent>

          {/* VARIANCE REQUESTS TAB */}
          <TabsContent value="variance-requests" className="m-0 data-[state=inactive]:hidden flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <VarianceRequestList
                varianceRequests={varianceRequests}
                isLoading={varianceLoading}
              />
            </ScrollArea>
          </TabsContent>

          {/* CONSUMPTIONS TAB */}
          <TabsContent value="consumptions" className="m-0 data-[state=inactive]:hidden flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <ConsumptionList consumptions={consumptions} isLoading={consumptionsLoading} />
            </ScrollArea>
          </TabsContent>

          {/* IMPORTS TAB */}
          <TabsContent value="imports" className="m-0 data-[state=inactive]:hidden flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <BudgetImportPanel orgId={selectedOrgId} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </V2Shell>
  );
}
